import { expect, it } from "vitest";
import sharp from "sharp";
import { createAuthentication } from "@/shared/infrastructure/auth/config";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCurrentActor, getCurrentProfile } from "@/modules/identity/server";
import {
  handleProfileUpdate,
  handleProfilePhoto,
} from "@/composition/profile/http";
import { signup, testRequest } from "../support/auth";

function update(
  cookie: string,
  form: FormData,
  origin = "http://localhost:3000",
  ip = "192.0.2.222",
) {
  return handleProfileUpdate(
    new Request("http://localhost:3000/api/profile", {
      method: "POST",
      headers: { cookie, origin, "x-forwarded-for": ip },
      body: form,
    }),
  );
}
function data(name: string, file?: File) {
  const form = new FormData();
  form.set("displayName", name);
  if (file) form.set("photo", file);
  return form;
}
async function image(format: "jpeg" | "png" | "webp") {
  return new File(
    [
      new Uint8Array(
        await sharp({
          create: {
            width: 600,
            height: 400,
            channels: 3,
            background: "#2455d8",
          },
        })
          .withMetadata({ orientation: 6 })
          .toFormat(format)
          .toBuffer(),
      ),
    ],
    `photo.${format}`,
    { type: `image/${format}` },
  );
}

it("persists each supported photo as a private resized WebP and edits only the session name", async () => {
  const auth = createAuthentication();
  const username = `profile${Date.now()}`;
  const account = await signup(auth, username);
  const other = await signup(auth, `other${Date.now()}`);
  for (const format of ["jpeg", "png", "webp"] as const) {
    const response = await update(
      account.cookie,
      data(`Player ${format}`, await image(format)),
    );
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({
      ok: true,
      value: { displayName: `Player ${format}`, username },
    });
  }
  const current = await getCurrentProfile(
    new Headers({ cookie: account.cookie }),
  );
  expect(current).toMatchObject({
    ok: true,
    value: { displayName: "Player webp", photoVersion: expect.any(Number) },
  });
  expect(
    await getCurrentActor(new Headers({ cookie: account.cookie })),
  ).toMatchObject({ ok: true, value: { displayName: "Player webp" } });
  const response = await handleProfilePhoto(
    new Request("http://localhost:3000/api/profile/photo", {
      headers: { cookie: account.cookie },
    }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  const metadata = await sharp(await response.arrayBuffer()).metadata();
  expect(metadata).toMatchObject({ format: "webp", width: 256, height: 256 });
  expect(metadata.exif).toBeUndefined();
  const otherPhoto = await handleProfilePhoto(
    new Request(
      `http://localhost:3000/api/profile/photo?userId=${account.user.id}`,
      { headers: { cookie: other.cookie } },
    ),
  );
  expect(otherPhoto.status).toBe(400);
  expect(
    (
      await handleProfilePhoto(
        new Request("http://localhost:3000/api/profile/photo", {
          headers: { cookie: other.cookie },
        }),
      )
    ).status,
  ).toBe(404);
  const previous = current.ok ? current.value.photoVersion : null;
  expect((await update(account.cookie, data("Name only"))).status).toBe(200);
  expect(
    await getCurrentProfile(new Headers({ cookie: account.cookie })),
  ).toMatchObject({
    ok: true,
    value: { displayName: "Name only", photoVersion: previous },
  });
  expect(
    (await prisma.user.findUniqueOrThrow({ where: { id: other.user.id } }))
      .name,
  ).toMatch(/^other/);
});

it("rejects forged identity, malformed names, hostile content and oversize files without partial writes", async () => {
  const account = await signup(createAuthentication(), `hostile${Date.now()}`);
  const original = (
    await prisma.user.findUniqueOrThrow({ where: { id: account.user.id } })
  ).name;
  const forged = data("Updated");
  forged.set("userId", "another-user");
  const duplicated = data("Updated");
  duplicated.append("displayName", "Duplicate");
  const cases = [
    forged,
    duplicated,
    data("ab"),
    data("x".repeat(21)),
    data("abc\n"),
    data(
      "Updated",
      new File(
        [
          "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>",
        ],
        "photo.png",
        { type: "image/png" },
      ),
    ),
    data(
      "Updated",
      new File(["not a photo"], "photo.jpg", { type: "image/jpeg" }),
    ),
    data(
      "Updated",
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], "photo.png", {
        type: "image/png",
      }),
    ),
  ];
  for (const form of cases) {
    const response = await update(
      account.cookie,
      form,
      undefined,
      "192.0.2.223",
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "VALIDATION" },
    });
  }
  expect(
    (await prisma.user.findUniqueOrThrow({ where: { id: account.user.id } }))
      .name,
  ).toBe(original);
  expect(
    await prisma.profilePhoto.findUnique({
      where: { authUserId: account.user.id },
    }),
  ).toBeNull();
});

it("refuses guest, absent, expired and revoked sessions and foreign origins", async () => {
  const auth = createAuthentication();
  const guestResponse = await testRequest(
    auth,
    "/sign-in/anonymous",
    { name: "Guest" },
    undefined,
    "192.0.2.224",
  );
  const guestCookie =
    guestResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
  expect((await update(guestCookie, data("Updated"))).status).toBe(403);
  expect((await update("", data("Updated"))).status).toBe(401);
  expect(
    (await update("", data("Updated"), "https://evil.example")).status,
  ).toBe(403);
  const account = await signup(auth, `expp${Date.now()}`);
  await prisma.session.updateMany({
    where: { userId: account.user.id },
    data: { expiresAt: new Date(0) },
  });
  expect((await update(account.cookie, data("Updated"))).status).toBe(401);
  const revoked = await signup(auth, `revp${Date.now()}`);
  await testRequest(auth, "/sign-out", {}, revoked.cookie);
  expect((await update(revoked.cookie, data("Updated"))).status).toBe(401);
  for (const cookie of [guestCookie, "", account.cookie, revoked.cookie]) {
    expect(
      (
        await handleProfilePhoto(
          new Request("http://localhost:3000/api/profile/photo", {
            headers: { cookie },
          }),
        )
      ).status,
    ).toBe(cookie === guestCookie ? 403 : 401);
  }
});

it("bounds streamed multipart bodies without Content-Length and rate-limits updates", async () => {
  const account = await signup(createAuthentication(), `limitp${Date.now()}`);
  const cookie = account.cookie;
  const original = (
    await prisma.user.findUniqueOrThrow({ where: { id: account.user.id } })
  ).name;
  const oversized = new Request("http://localhost:3000/api/profile", {
    method: "POST",
    headers: {
      cookie,
      origin: "http://localhost:3000",
      "content-type": "multipart/form-data; boundary=photo",
      "x-forwarded-for": "192.0.2.228",
    },
    body: new Uint8Array(2 * 1024 * 1024 + 64 * 1024 + 1),
  });
  expect(oversized.headers.has("content-length")).toBe(false);
  expect((await handleProfileUpdate(oversized)).status).toBe(400);
  const duplicatePhoto = data("Updated", await image("png"));
  duplicatePhoto.append("photo", await image("jpeg"));
  expect(
    (await update(cookie, duplicatePhoto, undefined, "192.0.2.229")).status,
  ).toBe(400);
  for (let count = 0; count < 10; count++) {
    expect(
      (await update(cookie, data("ab"), undefined, "192.0.2.230")).status,
    ).toBe(400);
  }
  const limited = await update(
    cookie,
    data("Valid name"),
    undefined,
    "192.0.2.230",
  );
  expect(limited.status).toBe(429);
  expect(await limited.json()).toMatchObject({
    ok: false,
    error: { code: "RATE_LIMITED" },
  });
  expect(
    (await prisma.user.findUniqueOrThrow({ where: { id: account.user.id } }))
      .name,
  ).toBe(original);
});
