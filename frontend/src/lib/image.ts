/**
 * Center-crop and downscale an image File to a small square JPEG Blob, ready to
 * upload as a profile picture. Doing this client-side keeps the upload tiny
 * (~256px) regardless of the original file size.
 */
const MAX_DIM = 256;

export function downscaleToSquare(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn’t a valid image."));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = MAX_DIM;
        canvas.height = MAX_DIM;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Image processing failed."));
          return;
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, MAX_DIM, MAX_DIM);
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(new Error("Image processing failed.")),
          "image/jpeg",
          0.85,
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
