const { publishMessage, MQTT_TOPICS, getMQTTClient } = require('../config/mqtt');
const logger = require('../utils/logger');
const { Device } = require('../models');

/**
 * MQTT Service
 * Handles communication with ESP32 devices
 */

/**
 * Send OPEN command to ESP32
 * @param {String} deviceId - Device MongoDB ID or ESP ID
 * @returns {Promise}
 */
const sendOpenCommand = async (deviceId) => {
  try {
    const command = {
      command: 'OPEN',
      deviceId: deviceId,
      timestamp: new Date().toISOString()
    };

    await publishMessage(MQTT_TOPICS.CONTROL, command);
    logger.info(`OPEN command sent to device ${deviceId}`);
    
    return { success: true, message: 'Open command sent successfully' };
  } catch (error) {
    logger.error(`Failed to send OPEN command: ${error.message}`);
    throw error;
  }
};

/**
 * Send DENY/CLOSE command to ESP32
 * @param {String} deviceId - Device MongoDB ID or ESP ID
 * @returns {Promise}
 */
const sendDenyCommand = async (deviceId) => {
  try {
    const command = {
      command: 'DENY',
      deviceId: deviceId,
      timestamp: new Date().toISOString()
    };

    await publishMessage(MQTT_TOPICS.CONTROL, command);
    logger.info(`DENY command sent to device ${deviceId}`);
    
    return { success: true, message: 'Deny command sent successfully' };
  } catch (error) {
    logger.error(`Failed to send DENY command: ${error.message}`);
    throw error;
  }
};

/**
 * Send custom command to ESP32
 * @param {String} deviceId - Device ID
 * @param {String} command - Command string
 * @param {Object} data - Additional data
 * @returns {Promise}
 */
const sendCustomCommand = async (deviceId, command, data = {}) => {
  try {
    const payload = {
      command: command,
      deviceId: deviceId,
      timestamp: new Date().toISOString(),
      ...data
    };

    await publishMessage(MQTT_TOPICS.CONTROL, payload);
    logger.info(`Custom command ${command} sent to device ${deviceId}`);
    
    return { success: true, message: 'Command sent successfully' };
  } catch (error) {
    logger.error(`Failed to send custom command: ${error.message}`);
    throw error;
  }
};

/**
 * Setup MQTT message handlers
 * @param {Function} onResponse - Callback for device responses
 * @param {Function} onStatus - Callback for device status updates
 */
const setupMessageHandlers = (onResponse, onStatus) => {
  try {
    const client = getMQTTClient();

    client.on('message', async (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());

        switch (topic) {
          case MQTT_TOPICS.RESPONSE:
            logger.info(`Device response received: ${message.toString()}`);
            if (onResponse) {
              await onResponse(payload);
            }
            break;

          case MQTT_TOPICS.STATUS:
            logger.info(`Device status update: ${message.toString()}`);
            if (onStatus) {
              await onStatus(payload);
            }
            // Update device status in database
            await updateDeviceStatus(payload);
            break;

          default:
            logger.warn(`Message received on unknown topic: ${topic}`);
        }
      } catch (error) {
        logger.error(`Error processing MQTT message: ${error.message}`);
      }
    });

    logger.info('MQTT message handlers setup complete');
  } catch (error) {
    logger.error(`Failed to setup MQTT handlers: ${error.message}`);
  }
};

/**
 * Update device status in database
 * @param {Object} payload - Status payload from device
 */
const updateDeviceStatus = async (payload) => {
  try {
    const { espId, status, metadata } = payload;

    const device = await Device.findOne({ espId });
    
    if (device) {
      device.status = status === 'online' ? 'online' : 'offline';
      device.lastSeen = new Date();
      
      if (metadata) {
        device.metadata = { ...device.metadata, ...metadata };
      }
      
      await device.save();
      logger.info(`Device ${espId} status updated to ${status}`);
    } else {
      logger.warn(`Device with ESP ID ${espId} not found in database`);
    }
  } catch (error) {
    logger.error(`Failed to update device status: ${error.message}`);
  }
};

/**
 * Check device connectivity
 * @param {String} deviceId - Device ID
 * @returns {Boolean}
 */
const isDeviceOnline = async (deviceId) => {
  try {
    const device = await Device.findById(deviceId);
    return device && device.status === 'online' && device.isRecentlyActive;
  } catch (error) {
    logger.error(`Failed to check device connectivity: ${error.message}`);
    return false;
  }
};

module.exports = {
  sendOpenCommand,
  sendDenyCommand,
  sendCustomCommand,
  setupMessageHandlers,
  isDeviceOnline,
  updateDeviceStatus
};
