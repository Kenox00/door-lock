const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

/**
 * Configure Cloudinary for image storage
 * Used for storing visitor photos in the cloud
 */
const configureCloudinary = () => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    logger.info('Cloudinary configured successfully');
  } catch (error) {
    logger.error(`Cloudinary configuration error: ${error.message}`);
  }
};

module.exports = { cloudinary, configureCloudinary };
