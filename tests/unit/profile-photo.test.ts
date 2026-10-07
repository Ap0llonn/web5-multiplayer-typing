import { expect, it } from "vitest";
import sharp from "sharp";
import { resizeProfilePhoto } from "@/modules/identity/infrastructure/profile-photo";

it("checks decoded bytes rather than trusting the filename or declared MIME", async () => {
  const bytes = await sharp({
    create: { width: 400, height: 300, channels: 3, background: "#2455d8" },
  })
    .png()
    .toBuffer();
  const result = await resizeProfilePhoto(
    new File([new Uint8Array(bytes)], "mislabelled.txt", {
      type: "text/plain",
    }),
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Valid PNG rejected");
  expect(await sharp(result.value).metadata()).toMatchObject({
    format: "webp",
    width: 256,
    height: 256,
  });
  for (const invalid of [
    new File([], "empty.png", { type: "image/png" }),
    new File(["GIF89a"], "pretend.png", { type: "image/png" }),
    new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], "broken.jpg", {
      type: "image/jpeg",
    }),
    new File([new Uint8Array(2 * 1024 * 1024 + 1)], "huge.webp", {
      type: "image/webp",
    }),
  ]) {
    expect(await resizeProfilePhoto(invalid)).toMatchObject({
      ok: false,
      error: { code: "VALIDATION" },
    });
  }
});

it("refuses compressed images exceeding the pixel limit", async () => {
  const bytes = await sharp({
    create: { width: 4097, height: 4097, channels: 3, background: "#2455d8" },
  })
    .png()
    .toBuffer();
  expect(bytes.byteLength).toBeLessThan(2 * 1024 * 1024);
  expect(
    await resizeProfilePhoto(new File([new Uint8Array(bytes)], "pixels.png")),
  ).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
});
