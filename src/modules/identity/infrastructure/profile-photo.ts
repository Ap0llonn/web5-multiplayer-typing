import "server-only";
import sharp from "sharp";
import { failure, success } from "@/shared/contracts/operation-result";
import { MAX_PROFILE_PHOTO_BYTES } from "../contracts/profile";

export async function resizeProfilePhoto(file: File) {
  if (file.size === 0 || file.size > MAX_PROFILE_PHOTO_BYTES)
    return failure("VALIDATION");
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value,
    );
    const ascii = new TextDecoder("ascii");
    const webp =
      ascii.decode(bytes.subarray(0, 4)) === "RIFF" &&
      ascii.decode(bytes.subarray(8, 12)) === "WEBP";
    if (!jpeg && !png && !webp) return failure("VALIDATION");
    const image = sharp(bytes, {
      limitInputPixels: 16_000_000,
      failOn: "warning",
      autoOrient: true,
    });
    const metadata = await image.metadata();
    if (
      !metadata.format ||
      !["jpeg", "png", "webp"].includes(metadata.format) ||
      (metadata.pages ?? 1) !== 1
    )
      return failure("VALIDATION");
    const photo = await image
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 80 })
      .timeout({ seconds: 5 })
      .toBuffer();
    return success(new Uint8Array(photo));
  } catch {
    return failure("VALIDATION");
  }
}
