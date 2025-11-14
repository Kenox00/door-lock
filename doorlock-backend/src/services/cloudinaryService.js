const { cloudinary } = require('../config/cloudinary');
const fs = require('fs').promises;
const logger = require('../utils/logger');

/**
 * Cloudinary Service
 * Handles image upload and management in cloud storage
 */

/**
 * Upload image to Cloudinary
 * @param {String} filePath - Local file path
 * @param {String} folder - Cloudinary folder name
 * @returns {Object} Upload result with URL and public_id
 */
const uploadImage = async (filePath, folder = 'doorlock/visitors') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 800, crop: 'limit' }, // Resize to max 800x800
        { quality: 'auto' }, // Auto quality optimization
        { fetch_format: 'auto' } // Auto format selection
      ],
      tags: ['visitor', 'doorlock']
    });

    // Delete local file after successful upload
    await fs.unlink(filePath);

    logger.info(`Image uploaded to Cloudinary: ${result.public_id}`);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    logger.error(`Cloudinary upload error: ${error.message}`);
    
    // Try to delete local file even if upload failed
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      logger.error(`Failed to delete local file: ${unlinkError.message}`);
    }
    
    throw new Error('Failed to upload image to cloud storage');
  }
};

/**
 * Upload image from buffer (memory)
 * @param {Buffer} buffer - Image buffer
 * @param {String} folder - Cloudinary folder name
 * @returns {Object} Upload result
 */
const uploadImageBuffer = (buffer, folder = 'doorlock/visitors') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ],
        tags: ['visitor', 'doorlock']
      },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary buffer upload error: ${error.message}`);
          reject(new Error('Failed to upload image'));
        } else {
          logger.info(`Image uploaded to Cloudinary: ${result.public_id}`);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Delete image from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Object} Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`Image deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    logger.error(`Cloudinary delete error: ${error.message}`);
    throw new Error('Failed to delete image from cloud storage');
  }
};

/**
 * Get image details
 * @param {String} publicId - Cloudinary public ID
 * @returns {Object} Image details
 */
const getImageDetails = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    logger.error(`Cloudinary get image error: ${error.message}`);
    throw new Error('Failed to get image details');
  }
};

module.exports = {
  uploadImage,
  uploadImageBuffer,
  deleteImage,
  getImageDetails
};
