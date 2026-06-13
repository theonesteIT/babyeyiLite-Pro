const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const OUTPUT_SIZE = 960;
const JPEG_QUALITY = 92;

async function optimizeStudentPortraitBuffer(inputBuffer) {
  const meta = await sharp(inputBuffer).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (!w || !h) throw new Error('Invalid image dimensions.');

  const crop = Math.min(w, h);
  const left = Math.max(0, Math.floor((w - crop) / 2));
  const top = Math.max(0, Math.floor((h - crop) * 0.12));

  return sharp(inputBuffer)
    .extract({ left, top, width: crop, height: crop })
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: 'cover' })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

function buildOptimizedFilename() {
  return `student-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.jpg`;
}

/** Read any supported image file and write an optimized square JPEG portrait. */
async function optimizeStudentPortraitFile(sourcePath, destDir) {
  const inputBuffer = fs.readFileSync(sourcePath);
  const outBuffer = await optimizeStudentPortraitBuffer(inputBuffer);
  const filename = buildOptimizedFilename();
  fs.writeFileSync(path.join(destDir, filename), outBuffer);
  return filename;
}

/** Replace an uploaded temp file with an optimized portrait in destDir. */
async function replaceUploadWithOptimizedPortrait(uploadedPath, destDir) {
  const filename = await optimizeStudentPortraitFile(uploadedPath, destDir);
  fs.unlink(uploadedPath, () => {});
  return filename;
}

module.exports = {
  optimizeStudentPortraitBuffer,
  optimizeStudentPortraitFile,
  replaceUploadWithOptimizedPortrait,
};
