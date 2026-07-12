const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Zero-disk buffer configuration engine
const storage = multer.memoryStorage();

// Accept only standard image formats
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('File validation failure: Target must be an image type.'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 } // Caps memory streams safely at 3MB
});

/**
 * High-performance inline image compression mapping using native threads
 * @param {Buffer} fileBuffer - Raw multipart image binary
 * @param {string} schoolId - Tenant isolation scope identifier
 * @returns {Promise<string>} Relative path string pointer for the database
 */
const compressTeacherPhoto = async (fileBuffer, schoolId) => {
  const uploadDir = path.join(__dirname, `../public/uploads/tenant-${schoolId}/teachers`);
  
  // Check directory existence synchronously once per tenant branch folder creation
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
  const fullOutputPath = path.join(uploadDir, uniqueFileName);

  // Stream process directly using fast internal native memory threads
  await sharp(fileBuffer)
    .resize(400, 400, { fit: 'cover', position: 'center' })
    .webp({ quality: 80 })
    .toFile(fullOutputPath);

  return `/uploads/tenant-${schoolId}/teachers/${uniqueFileName}`;
};

module.exports = {
  uploadPhoto: upload.single('photo'), // Expects form-data field key to be named 'photo'
  compressTeacherPhoto
};