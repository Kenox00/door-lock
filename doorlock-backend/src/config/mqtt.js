const mqtt = require('mqtt');
const logger = require('../utils/logger');

let mqttClient = null;

/**
 * MQTT Topics used in the system
 * Device-specific topics to ensure commands reach only intended devices
 */
const MQTT_TOPICS = {
  CONTROL: '/door/lock/control',      // Legacy generic topic (deprecated)
  RESPONSE: '/door/lock/response',    // Receive status from ESP32
  STATUS: '/door/lock/status',        // Device online/offline status
  // Device-specific topics
  DEVICE_COMMAND: (deviceId) => `iot/commands/${deviceId}`,  // Send commands to specific device
  DEVICE_RESPONSE: (deviceId) => `iot/responses/${deviceId}`, // Receive responses from specific device
  DEVICE_STATUS: (deviceId) => `iot/status/${deviceId}`,     // Device-specific status
};

/**
 * Initialize MQTT Client
 * Connects to MQTT broker and handles device communication
 */
const initMQTT = () => {
  return new Promise((resolve, reject) => {
    try {
      const options = {
        clientId: process.env.MQTT_CLIENT_ID || `doorlock_${Math.random().toString(16).slice(3)}`,
        clean: true,
        connectTimeout: 10000, // Increased for cloud connections
        reconnectPeriod: 5000, // Slower reconnection for cloud
        keepalive: 60, // Send ping every 60 seconds
        reschedulePings: true,
        pingTimeout: 10, // Wait 10 seconds for ping response
        // HiveMQ Cloud specific settings
        protocol: 'mqtts', // Secure MQTT over TLS
        port: 8883, // Standard secure MQTT port
        rejectUnauthorized: true, // Verify SSL certificates
        // Additional security
        will: {
          topic: 'door/lock/status',
          payload: JSON.stringify({
            clientId: process.env.MQTT_CLIENT_ID || 'doorlock-backend',
            status: 'offline',
            timestamp: new Date().toISOString()
          }),
          qos: 1,
          retain: true
        }
      };

      // Add credentials if provided
      if (process.env.MQTT_USERNAME) {
        options.username = process.env.MQTT_USERNAME;
        options.password = process.env.MQTT_PASSWORD;
      }

      // Parse broker URL to ensure proper format
      let brokerUrl = process.env.MQTT_BROKER_URL;
      if (!brokerUrl) {
        reject(new Error('MQTT_BROKER_URL environment variable is required'));
        return;
      }

      // Ensure URL has proper protocol for HiveMQ Cloud
      if (!brokerUrl.startsWith('mqtts://') && !brokerUrl.startsWith('mqtt://')) {
        brokerUrl = `mqtts://${brokerUrl}`;
      }

      logger.info(`Connecting to MQTT broker: ${brokerUrl}`);

      mqttClient = mqtt.connect(brokerUrl, options);

      mqttClient.on('connect', () => {
        logger.info('✅ MQTT Client Connected to HiveMQ Cloud');

        // Subscribe to response and status topics with error handling
        const topics = [MQTT_TOPICS.RESPONSE, MQTT_TOPICS.STATUS];
        mqttClient.subscribe(topics, { qos: 1 }, (err, granted) => {
          if (err) {
            logger.error(`❌ MQTT Subscription error: ${err.message}`);
            reject(new Error(`Failed to subscribe to topics: ${err.message}`));
          } else {
            logger.info(`✅ MQTT Subscribed to topics: ${topics.join(', ')}`);
            logger.info(`📋 Granted subscriptions: ${JSON.stringify(granted)}`);
            resolve(mqttClient);
          }
        });
      });

      mqttClient.on('error', (error) => {
        logger.error(`❌ MQTT Connection Error: ${error.message}`);
        reject(error);
      });

      mqttClient.on('reconnect', () => {
        logger.warn('🔄 MQTT Client reconnecting to HiveMQ Cloud...');
      });

      mqttClient.on('offline', () => {
        logger.warn('⚠️ MQTT Client offline - will attempt reconnection');
      });

      mqttClient.on('close', () => {
        logger.warn('🔌 MQTT Connection closed');
      });

      mqttClient.on('message', async (topic, message, packet) => {
        try {
          const payload = message.toString();
          logger.info(`📨 MQTT Message received on ${topic}: ${payload}`);

          // Parse and route to appropriate handler
          if (topic && payload) {
            const data = JSON.parse(payload);
            await routeMQTTMessage(topic, data);
          }
        } catch (error) {
          logger.error(`❌ Error processing MQTT message: ${error.message}`);
        }
      });

    } catch (error) {
      logger.error(`❌ MQTT Initialization error: ${error.message}`);
      reject(error);
    }
  });
};

/**
 * Route MQTT messages to handlers
 */
const routeMQTTMessage = async (topic, data) => {
  try {
    const deviceConnectionManager = require('../services/deviceConnectionManager');
    const { getIO, SOCKET_EVENTS } = require('./socket');
    const { Device } = require('../models');
    const DeviceEvent = require('../models/DeviceEvent');

    // Check for device-specific response topics: iot/responses/{deviceId}
    if (topic.startsWith('iot/responses/')) {
      const deviceId = topic.split('/')[2];
      logger.info(`📨 Device-specific response from ${deviceId}: ${JSON.stringify(data)}`);
      
      if (data.commandId) {
        await deviceConnectionManager.handleCommandAck(
          data.commandId,
          data.status || 'executed',
          data.errorMessage
        );
      }
      return;
    }

    switch (topic) {
      case MQTT_TOPICS.RESPONSE:
        // Legacy device response to command
        logger.info(`Device response (legacy topic): ${JSON.stringify(data)}`);
        
        if (data.commandId) {
          await deviceConnectionManager.handleCommandAck(
            data.commandId,
            data.status || 'executed',
            data.errorMessage
          );
        }
        break;

      case MQTT_TOPICS.STATUS:
        // Device status update
        const { espId, status, metadata } = data;
        
        // Find device
        const device = await Device.findOne({ espId });
        if (device) {
          const deviceIdStr = device._id.toString();
          logger.info(`📱 Device status update: ${device.name} (${espId}) - Status: ${status}`);
          
          // Update connection manager
          if (status === 'online') {
            await deviceConnectionManager.registerDevice(
              deviceIdStr,
              'mqtt',
              mqttClient,
              metadata || {}
            );
            
            // Subscribe to device-specific command topic
            const deviceCommandTopic = MQTT_TOPICS.DEVICE_COMMAND(deviceIdStr);
            const deviceResponseTopic = MQTT_TOPICS.DEVICE_RESPONSE(deviceIdStr);
            
            logger.info(`🔔 Subscribing to device-specific topics:`);
            logger.info(`   - Commands: ${deviceCommandTopic}`);
            logger.info(`   - Responses: ${deviceResponseTopic}`);
            
            mqttClient.subscribe([deviceCommandTopic, deviceResponseTopic], { qos: 1 }, (err, granted) => {
              if (err) {
                logger.error(`❌ Failed to subscribe to device topics: ${err.message}`);
              } else {
                logger.info(`✅ Subscribed to device ${deviceIdStr} topics`);
                logger.info(`📋 Granted: ${JSON.stringify(granted)}`);
              }
            });
          } else {
            await deviceConnectionManager.unregisterDevice(
              deviceIdStr,
              'mqtt',
              'status_update'
            );
            
            // Unsubscribe from device-specific topics
            const deviceCommandTopic = MQTT_TOPICS.DEVICE_COMMAND(deviceIdStr);
            const deviceResponseTopic = MQTT_TOPICS.DEVICE_RESPONSE(deviceIdStr);
            
            logger.info(`🔕 Unsubscribing from device topics: ${deviceCommandTopic}, ${deviceResponseTopic}`);
            mqttClient.unsubscribe([deviceCommandTopic, deviceResponseTopic]);
          }

          // Update database
          await Device.findByIdAndUpdate(device._id, {
            status: status === 'online' ? 'online' : 'offline',
            lastSeen: new Date(),
            ...(metadata && { metadata: { ...device.metadata, ...metadata } })
          });

          // Log event
          await DeviceEvent.logEvent({
            deviceId: device._id,
            eventType: status === 'online' ? 'device_connected' : 'device_disconnected',
            payload: { espId, status, metadata },
            metadata: { source: 'mqtt' }
          });

          // Broadcast to dashboards
          const io = getIO();
          io.to(`user:${device.userId}`).emit(SOCKET_EVENTS.DEVICE_STATUS, {
            deviceId: device._id,
            deviceName: device.name,
            status: status === 'online' ? 'online' : 'offline',
            timestamp: new Date()
          });
        } else {
          logger.warn(`⚠️ Received status for unknown ESP ID: ${espId}`);
        }
        break;

      default:
        logger.warn(`Message received on unknown MQTT topic: ${topic}`);
    }
  } catch (error) {
    logger.error(`Error routing MQTT message: ${error.message}`);
  }
};

/**
 * Get MQTT Client instance
 */
const getMQTTClient = () => {
  if (!mqttClient) {
    throw new Error('MQTT Client not initialized. Call initMQTT() first.');
  }
  return mqttClient;
};

/**
 * Publish message to MQTT topic
 */
const publishMessage = (topic, message, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!mqttClient || !mqttClient.connected) {
      const error = new Error('MQTT Client not connected');
      logger.error(`❌ ${error.message}`);
      return reject(error);
    }

    // Validate topic
    if (!topic || typeof topic !== 'string') {
      const error = new Error('Invalid topic: must be a non-empty string');
      logger.error(`❌ ${error.message}`);
      return reject(error);
    }

    // Validate message
    if (message === null || message === undefined) {
      const error = new Error('Invalid message: cannot be null or undefined');
      logger.error(`❌ ${error.message}`);
      return reject(error);
    }

    // Prepare payload
    let payload;
    try {
      payload = typeof message === 'string' ? message : JSON.stringify(message);
    } catch (error) {
      logger.error(`❌ Error serializing message: ${error.message}`);
      return reject(new Error('Failed to serialize message'));
    }

    // Validate payload size (MQTT limit is 256MB, but be reasonable)
    if (Buffer.byteLength(payload, 'utf8') > 1024 * 1024) { // 1MB limit
      const error = new Error('Message too large: maximum 1MB allowed');
      logger.error(`❌ ${error.message}`);
      return reject(error);
    }

    // Default publish options
    const publishOptions = {
      qos: 1, // At least once delivery
      retain: false, // Don't retain command messages
      ...options
    };

    logger.info(`📤 Publishing to ${topic} (QoS: ${publishOptions.qos}, Retain: ${publishOptions.retain})`);

    mqttClient.publish(topic, payload, publishOptions, (error) => {
      if (error) {
        logger.error(`❌ MQTT Publish error: ${error.message}`);
        reject(error);
      } else {
        logger.info(`✅ MQTT Published to ${topic}: ${payload.substring(0, 200)}${payload.length > 200 ? '...' : ''}`);
        resolve();
      }
    });
  });
};

/**
 * Subscribe to MQTT topic
 */
const subscribeToTopic = (topic, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!mqttClient || !mqttClient.connected) {
      const error = new Error('MQTT Client not connected');
      logger.error(`❌ ${error.message}`);
      return reject(error);
    }

    // Validate topic
    if (!topic || typeof topic !== 'string') {
      const error = new Error('Invalid topic: must be a non-empty string');
      logger.error(`❌ ${error.message}`);
      return reject(error);
    }

    // Default subscribe options
    const subscribeOptions = {
      qos: 1, // At least once delivery
      ...options
    };

    logger.info(`📡 Subscribing to ${topic} (QoS: ${subscribeOptions.qos})`);

    mqttClient.subscribe(topic, subscribeOptions, (error, granted) => {
      if (error) {
        logger.error(`❌ MQTT Subscribe error: ${error.message}`);
        reject(error);
      } else {
        logger.info(`✅ MQTT Subscribed to ${topic}`);
        if (granted && granted.length > 0) {
          granted.forEach(grant => {
            logger.debug(`   Granted QoS ${grant.qos} for topic ${grant.topic}`);
          });
        }
        resolve(granted);
      }
    });
  });
};

module.exports = {
  initMQTT,
  getMQTTClient,
  publishMessage,
  subscribeToTopic,
  MQTT_TOPICS
};
