const mqtt = require('mqtt');
const logger = require('../utils/logger');

let mqttClient = null;

/**
 * MQTT Topics used in the system
 */
const MQTT_TOPICS = {
  CONTROL: '/door/lock/control',      // Send commands to ESP32
  RESPONSE: '/door/lock/response',    // Receive status from ESP32
  STATUS: '/door/lock/status',        // Device online/offline status
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

      mqttClient.on('message', (topic, message, packet) => {
        try {
          const payload = message.toString();
          logger.info(`📨 MQTT Message received on ${topic}: ${payload}`);

          // Validate message format
          if (topic && payload) {
            // Here you would typically route messages to appropriate handlers
            // For now, just log them
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
