const QRCode = require('qrcode');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * QR Code Service
 * Handles QR code generation and onboarding URL creation
 */

/**
 * Generate a secure device token
 * @returns {String} - Secure random token
 */
const generateDeviceToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate onboarding URL for device
 * @param {Object} deviceData - Device information
 * @returns {String} - Onboarding URL
 */
const generateOnboardingURL = (deviceData) => {
  const cameraAppUrl = process.env.CAMERA_APP_URL || 'http://localhost:5173';
  const { deviceId, deviceToken, deviceType, room } = deviceData;
  
  // Build URL with query parameters
  const url = new URL(`${cameraAppUrl}/device/connect`);
  url.searchParams.append('deviceId', deviceId);
  url.searchParams.append('token', deviceToken);
  url.searchParams.append('type', deviceType);
  if (room) {
    url.searchParams.append('room', room);
  }
  
  return url.toString();
};

/**
 * Generate QR code as base64 data URL
 * @param {String} url - URL to encode in QR code
 * @returns {Promise<String>} - Base64 data URL of QR code
 */
const generateQRCodeBase64 = async (url) => {
  try {
    const qrDataURL = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    });
    
    return qrDataURL;
  } catch (error) {
    logger.error(`QR code generation error: ${error.message}`);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code as buffer (for file download)
 * @param {String} url - URL to encode in QR code
 * @returns {Promise<Buffer>} - QR code image buffer
 */
const generateQRCodeBuffer = async (url) => {
  try {
    const buffer = await QRCode.toBuffer(url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    });
    
    return buffer;
  } catch (error) {
    logger.error(`QR code buffer generation error: ${error.message}`);
    throw new Error('Failed to generate QR code buffer');
  }
};

/**
 * Generate complete QR onboarding data for device
 * @param {Object} device - Device document
 * @returns {Promise<Object>} - QR data including URL and base64 image
 */
const generateDeviceQRData = async (device) => {
  try {
    const onboardingURL = generateOnboardingURL({
      deviceId: device._id.toString(),
      deviceToken: device.deviceToken,
      deviceType: device.deviceType,
      room: device.room
    });
    
    const qrCodeBase64 = await generateQRCodeBase64(onboardingURL);
    
    return {
      deviceId: device._id.toString(),
      deviceName: device.name,
      deviceType: device.deviceType,
      room: device.room,
      onboardingURL,
      qrCode: qrCodeBase64,
      activated: device.activated,
      activatedAt: device.activatedAt
    };
  } catch (error) {
    logger.error(`Generate device QR data error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  generateDeviceToken,
  generateOnboardingURL,
  generateQRCodeBase64,
  generateQRCodeBuffer,
  generateDeviceQRData
};
