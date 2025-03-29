const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

/**
 * Convert an image file to base64 string
 * @param {string} filePath - Path to the image file
 * @returns {Promise<string>} - Base64 string representation of the image
 */
const imageToBase64 = async (filePath) => {
  try {
    const data = await readFileAsync(filePath);
    return data.toString('base64');
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

/**
 * Creates directory if it doesn't exist
 * @param {string} dirPath - Path to directory
 */
const ensureDirectoryExists = async (dirPath) => {
  try {
    await mkdirAsync(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

/**
 * Save uploaded file to disk
 * @param {Object} file - Multer file object
 * @param {string} directory - Directory to save file
 * @param {string} filename - Name to save file as
 * @returns {Promise<string>} - Path where file was saved
 */
const saveUploadedFile = async (file, directory, filename) => {
  try {
    await ensureDirectoryExists(directory);
    
    const ext = path.extname(file.originalname);
    const filePath = path.join(directory, `${filename}${ext}`);
    
    // If file is buffer (memory storage)
    if (file.buffer) {
      await writeFileAsync(filePath, file.buffer);
    }
    // If file is on disk (disk storage)
    else if (file.path) {
      const sourceStream = fs.createReadStream(file.path);
      const destStream = fs.createWriteStream(filePath);
      
      return new Promise((resolve, reject) => {
        sourceStream.pipe(destStream);
        sourceStream.on('error', reject);
        destStream.on('error', reject);
        destStream.on('finish', () => resolve(filePath));
      });
    }
    
    return filePath;
  } catch (error) {
    console.error('Error saving uploaded file:', error);
    throw error;
  }
};

/**
 * Get file MIME type
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - MIME type of the file
 */
const getFileMimeType = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.webp': 'image/webp'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
};

module.exports = {
  imageToBase64,
  ensureDirectoryExists,
  saveUploadedFile,
  getFileMimeType
}; 