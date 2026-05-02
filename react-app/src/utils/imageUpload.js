const MAX_DIMENSION = 1600;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const hasImageExtension = (name = '') => /\.(png|jpe?g|gif|webp|svg|tif|tiff|bmp|avif)$/i.test(name);

const readImageFromFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read selected image.'));
    img.src = reader.result;
  };
  reader.onerror = () => reject(new Error('Could not read selected file.'));
  reader.readAsDataURL(file);
});

const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error('Image compression failed.'));
  }, type, quality);
});

const shouldSkipCompression = (file) => {
  const type = (file?.type || '').toLowerCase();
  return !(type.startsWith('image/') || hasImageExtension(file?.name || ''));
};

export const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export async function optimizeImageForUpload(file, options = {}) {
  const {
    targetBytes = 1024 * 1024,
    hardMaxBytes = 10 * 1024 * 1024,
    maxDimension = MAX_DIMENSION,
    outputType = 'image/jpeg',
    minQuality = 0.5,
    maxQuality = 0.9,
  } = options;

  if (!file) {
    throw new Error('No file selected.');
  }

  if (shouldSkipCompression(file)) {
    throw new Error('Please upload a valid image file (PNG, JPG, JPEG, GIF, WEBP, SVG, TIFF, BMP, or AVIF).');
  }

  if (file.size <= hardMaxBytes) {
    return file;
  }

  const image = await readImageFromFile(file);
  const largestSide = Math.max(image.width, image.height);
  const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Your browser cannot process this image.');
  }

  ctx.drawImage(image, 0, 0, width, height);

  let quality = clamp(maxQuality, minQuality, 1);
  let blob = await canvasToBlob(canvas, outputType, quality);

  while (blob.size > targetBytes && quality > minQuality) {
    quality = clamp(quality - 0.08, minQuality, 1);
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  if (blob.size > hardMaxBytes) {
    throw new Error(`Image is too large after compression (${formatBytes(blob.size)}). Please choose another image.`);
  }

  const originalName = (file.name || 'upload').replace(/\.[^.]+$/, '');
  const optimizedName = `${originalName}.jpg`;

  return new File([blob], optimizedName, {
    type: outputType,
    lastModified: Date.now(),
  });
}
