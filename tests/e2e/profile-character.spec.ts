import { expect, test } from "@playwright/test";
import sharp from "sharp";
test.use({ trace: "off" });
test("selects a real uploaded profile photo and shows it in the room", async ({
  page,
}) => {
  const request = page.request;
  const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  const username = `photo${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
  expect(
    (
      await request.post("/api/auth/sign-up/email", {
        headers: { origin },
        data: {
          name: username,
          username,
          email: `${username}@example.test`,
          password: "test-password-123",
        },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/en/play/create");
  await expect(
    page.getByRole("radio", { name: "Profile photo", exact: true }),
  ).toHaveCount(0);
  const buffer = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#ff0000" },
  })
    .png()
    .toBuffer();
  expect(
    (
      await request.post("/api/profile", {
        headers: { origin },
        multipart: {
          displayName: username,
          photo: { name: "photo.png", mimeType: "image/png", buffer },
        },
      })
    ).status(),
  ).toBe(200);
  await page.reload();
  await page
    .locator("label")
    .filter({
      has: page.getByRole("radio", { name: "Profile photo", exact: true }),
    })
    .click();
  await expect(
    page.getByRole("radio", { name: "Profile photo", exact: true }),
  ).toBeChecked();
  await page.getByLabel("Room name").fill("Photo room");
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(page.getByTestId("room-code")).toBeVisible();
  const photo = page.locator('[data-character="profile"] image');
  await expect(photo).toBeVisible();
  const source = await photo.first().getAttribute("href");
  expect(source).toContain("/api/players/photo?player=");
  if (!source) throw new Error("Missing player photo URL");
  const response = await request.get(source);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/webp");
});
