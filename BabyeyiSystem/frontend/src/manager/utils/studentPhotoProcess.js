/**
 * Crop, resize, and optimize student portraits before upload.
 * Square crop (portrait-biased), 960px JPEG @ 92% — sharp on cards & report PDFs.
 */

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image file.'));
    };
    img.src = url;
  });
}

/** Center square crop, shifted slightly up for head-and-shoulders portraits. */
export function cropSquarePortraitToCanvas(img, outputSize = 960) {
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  if (!sw || !sh) throw new Error('Invalid image dimensions.');

  const crop = Math.min(sw, sh);
  const sx = Math.max(0, Math.floor((sw - crop) / 2));
  const sy = Math.max(0, Math.floor((sh - crop) * 0.12));

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outputSize, outputSize);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, crop, crop, 0, 0, outputSize, outputSize);
  return canvas;
}

export async function processStudentPortraitFile(file, { size = 960, quality = 0.92 } = {}) {
  if (!file) throw new Error('No file selected.');
  const type = String(file.type || '').toLowerCase();
  if (!ALLOWED_TYPES.has(type)) {
    throw new Error('Only JPG, PNG, or WebP images are allowed.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Image must be under 12MB.');
  }

  const img = await loadImageElement(file);
  const canvas = cropSquarePortraitToCanvas(img, size);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not export image.'))),
      'image/jpeg',
      quality,
    );
  });

  const base = String(file.name || 'student').replace(/\.[^.]+$/i, '') || 'student';
  const processed = new File([blob], `${base}-portrait.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });

  return {
    file: processed,
    previewUrl: URL.createObjectURL(blob),
    width: size,
    height: size,
  };
}

export function revokePortraitPreview(url) {
  if (url && String(url).startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
