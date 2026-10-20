// Only the resized, re-encoded square is sent to the API. No file URLs are persisted.
export async function preparePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG or WebP photo.");
  if (file.size > 8 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 8 MB.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This image could not be opened. Choose another photo.");
  });
  try {
    const size = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = 384;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this photo.");
    context.fillStyle = "#edf5f4";
    context.fillRect(0, 0, 384, 384);
    context.drawImage(
      bitmap,
      (bitmap.width - size) / 2,
      (bitmap.height - size) / 2,
      size,
      size,
      0,
      0,
      384,
      384,
    );
    const data = canvas.toDataURL("image/jpeg", 0.84);
    if (data.length > 180000)
      throw new Error("This photo is too detailed. Choose a smaller image.");
    return data;
  } finally {
    bitmap.close();
  }
}
