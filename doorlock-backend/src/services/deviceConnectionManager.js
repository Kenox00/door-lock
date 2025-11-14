const logger = require('../utils/logger');
const { Device } = require('../models');
const DeviceEvent = require('../models/DeviceEvent');
const { getIO } = require('../config/socket');
const { v4: uuidv4 } = require('uuid');

/**
 * Device Connection Manager
 * Centralized service to track and manage device connections (WebSocket + MQTT)
 */
class DeviceConnectionManager {
  constructor() {
    this.connections = new Map(); // deviceId -> { socket, mqtt, status, metadata }
    this.commandQueue = new Map(); // commandId -> { deviceId, command, status, timestamp }
  }

  /**
   * Register a device connection
   * @param {String} deviceId - MongoDB device ID
   * @param {String} connectionType - 'socket' or 'mqtt'
   * @param {Object} connection - Socket or MQTT client reference
   * @param {Object} metadata - Additional connection metadata
   */
  async registerDevice(deviceId, connectionType, connection, metadata = {}) {
    try {
      const existing = this.connections.get(deviceId);
      
      if (!existing) {
        this.connections.set(deviceId, {
          deviceId,
          [connectionType]: connection,
          status: 'online',
          connectedAt: new Date(),
          lastSeen: new Date(),
          metadata
        });
      } else {
        existing[connectionType] = connection;
        existing.lastSeen = new Date();
        existing.status = 'online';
        existing.metadata = { ...existing.metadata, ...metadata };
      }

      // Update database
      await Device.findByIdAndUpdate(deviceId, {
        status: 'online',
        lastSeen: new Date(),
        ipAddress: metadata.ipAddress || null
      });

      // Log event
      await DeviceEvent.logEvent({
        deviceId,
        eventType: 'device_connected',
        payload: { connectionType, metadata },
        metadata: {
          source: connectionType === 'socket' ? 'websocket' : 'mqtt',
          ipAddress: metadata.ipAddress
        }
      });

      // Notify dashboards
      const io = getIO();
      const device = await Device.findById(deviceId).select('name espId userId');
      
      if (device) {
        // Notify device owner
        io.to(`user:${device.userId}`).emit('device_connected', {
          deviceId: device._id,
          deviceName: device.name,
          timestamp: new Date()
        });
        
        // Notify device-specific room
        io.to(`device:${deviceId}`).emit('device_status', {
          status: 'online',
          connectionType,
          timestamp: new Date()
        });
      }

      logger.info(`Device ${deviceId} registered via ${connectionType}`);
      return true;

    } catch (error) {
      logger.error(`Failed to register device: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unregister a device connection
   * @param {String} deviceId - MongoDB device ID
   * @param {String} connectionType - 'socket' or 'mqtt'
   * @param {String} reason - Disconnection reason
   */
  async unregisterDevice(deviceId, connectionType, reason = 'unknown') {
    try {
      const conn = this.connections.get(deviceId);
      
      if (!conn) {
        logger.warn(`Attempted to unregister unknown device: ${deviceId}`);
        return;
      }

      // Remove specific connection type
      delete conn[connectionType];
      
      // If no connections remain, mark as offline
      if (!conn.socket && !conn.mqtt) {
        conn.status = 'offline';
        this.connections.delete(deviceId);

        // Update database
        await Device.findByIdAndUpdate(deviceId, {
          status: 'offline',
          lastSeen: new Date()
        });

        // Log event
        await DeviceEvent.logEvent({
          deviceId,
          eventType: 'device_disconnected',
          payload: { connectionType, reason },
          metadata: {
            source: connectionType === 'socket' ? 'websocket' : 'mqtt'
          }
        });

        // Notify dashboards
        const io = getIO();
        const device = await Device.findById(deviceId).select('name espId userId');
        
        if (device) {
          io.to(`user:${device.userId}`).emit('device_disconnected', {
            deviceId: device._id,
            deviceName: device.name,
            reason,
            timestamp: new Date()
          });
          
          io.to(`device:${deviceId}`).emit('device_status', {
            status: 'offline',
            reason,
            timestamp: new Date()
          });
        }

        logger.info(`Device ${deviceId} unregistered (${connectionType}): ${reason}`);
      } else {
        logger.info(`Device ${deviceId} ${connectionType} connection removed, other connection remains`);
      }

    } catch (error) {
      logger.error(`Failed to unregister device: ${error.message}`);
    }
  }

  /**
   * Send command to device
   * @param {String} deviceId - MongoDB device ID
   * @param {String} command - Command type
   * @param {Object} payload - Command payload
   * @param {String} userId - User who initiated the command
   * @returns {Promise<Object>} Command result with commandId
   */
  async sendCommand(deviceId, command, payload = {}, userId = null) {
    try {
      const conn = this.connections.get(deviceId);
      
      if (!conn || conn.status !== 'online') {
        throw new Error('Device not connected');
      }

      const commandId = uuidv4();
      const commandData = {
        commandId,
        command,
        timestamp: new Date().toISOString(),
        ...payload
      };

      // Store command in queue for tracking
      this.commandQueue.set(commandId, {
        deviceId,
        command,
        status: 'sent',
        sentAt: new Date(),
        userId
      });

      // Log event
      await DeviceEvent.logEvent({
        deviceId,
        eventType: 'command_sent',
        commandId,
        userId,
        payload: { command, payload },
        metadata: { source: 'websocket' }
      });

      // Try WebSocket first, fallback to MQTT
      let sent = false;

      if (conn.socket && conn.socket.connected) {
        conn.socket.emit(command, commandData);
        sent = true;
        logger.info(`Command ${commandId} sent via WebSocket to device ${deviceId}`);
      } else if (conn.mqtt) {
        const { publishMessage, MQTT_TOPICS } = require('../config/mqtt');
        await publishMessage(MQTT_TOPICS.CONTROL, commandData);
        sent = true;
        logger.info(`Command ${commandId} sent via MQTT to device ${deviceId}`);
      }

      if (!sent) {
        throw new Error('No active connection for device');
      }

      // Set timeout to mark command as failed if no ack received
      setTimeout(() => {
        const cmd = this.commandQueue.get(commandId);
        if (cmd && cmd.status === 'sent') {
          cmd.status = 'timeout';
          logger.warn(`Command ${commandId} timed out for device ${deviceId}`);
          
          // Log timeout event
          DeviceEvent.logEvent({
            deviceId,
            eventType: 'command_failed',
            commandId,
            userId,
            payload: { command, reason: 'timeout' }
          });
        }
      }, 30000); // 30 second timeout

      return { commandId, status: 'sent' };

    } catch (error) {
      logger.error(`Failed to send command to device ${deviceId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle command acknowledgment from device
   * @param {String} commandId - Command ID
   * @param {String} status - 'received', 'executing', 'executed', 'failed'
   * @param {String} errorMessage - Error message if failed
   */
  async handleCommandAck(commandId, status, errorMessage = null) {
    try {
      const cmd = this.commandQueue.get(commandId);
      
      if (!cmd) {
        logger.warn(`Received ack for unknown command: ${commandId}`);
        return;
      }

      cmd.status = status;
      cmd.lastUpdate = new Date();

      // Log event
      await DeviceEvent.logEvent({
        deviceId: cmd.deviceId,
        eventType: status === 'failed' ? 'command_failed' : 'command_executed',
        commandId,
        userId: cmd.userId,
        payload: { command: cmd.command, status, errorMessage }
      });

      // Notify dashboard
      const io = getIO();
      const device = await Device.findById(cmd.deviceId).select('userId');
      
      if (device) {
        io.to(`user:${device.userId}`).emit('command_status', {
          commandId,
          deviceId: cmd.deviceId,
          command: cmd.command,
          status,
          errorMessage,
          timestamp: new Date()
        });
      }

      // Remove from queue if completed or failed
      if (status === 'executed' || status === 'failed') {
        this.commandQueue.delete(commandId);
      }

      logger.info(`Command ${commandId} status updated: ${status}`);

    } catch (error) {
      logger.error(`Failed to handle command ack: ${error.message}`);
    }
  }

  /**
   * Update device heartbeat
   * @param {String} deviceId - MongoDB device ID
   * @param {Object} status - Status update from device
   */
  async updateHeartbeat(deviceId, status = {}) {
    try {
      const conn = this.connections.get(deviceId);
      
      if (conn) {
        conn.lastSeen = new Date();
        
        if (status.batteryLevel !== undefined) {
          conn.metadata.batteryLevel = status.batteryLevel;
        }
      }

      // Update database
      await Device.findByIdAndUpdate(deviceId, {
        lastSeen: new Date(),
        ...(status.batteryLevel && { 'metadata.batteryLevel': status.batteryLevel })
      });

      // Check for low battery
      if (status.batteryLevel && status.batteryLevel < 20) {
        await this.handleLowBattery(deviceId, status.batteryLevel);
      }

    } catch (error) {
      logger.error(`Failed to update heartbeat: ${error.message}`);
    }
  }

  /**
   * Handle low battery alert
   * @param {String} deviceId - MongoDB device ID
   * @param {Number} batteryLevel - Current battery level
   */
  async handleLowBattery(deviceId, batteryLevel) {
    try {
      // Log event
      await DeviceEvent.logEvent({
        deviceId,
        eventType: 'low_battery',
        payload: { batteryLevel }
      });

      // Notify device owner
      const io = getIO();
      const device = await Device.findById(deviceId).select('name userId');
      
      if (device) {
        io.to(`user:${device.userId}`).emit('system_alert', {
          level: 'warning',
          message: `Low battery on ${device.name}: ${batteryLevel}%`,
          deviceId,
          timestamp: new Date()
        });
      }

      logger.warn(`Low battery alert for device ${deviceId}: ${batteryLevel}%`);

    } catch (error) {
      logger.error(`Failed to handle low battery alert: ${error.message}`);
    }
  }

  /**
   * Get device connection status
   * @param {String} deviceId - MongoDB device ID
   * @returns {Object|null} Connection info
   */
  getDeviceStatus(deviceId) {
    const conn = this.connections.get(deviceId);
    
    if (!conn) {
      return null;
    }

    return {
      deviceId: conn.deviceId,
      status: conn.status,
      hasSocket: !!conn.socket,
      hasMqtt: !!conn.mqtt,
      connectedAt: conn.connectedAt,
      lastSeen: conn.lastSeen,
      metadata: conn.metadata
    };
  }

  /**
   * Get all connected devices
   * @returns {Array} Array of device connection info
   */
  getAllConnectedDevices() {
    return Array.from(this.connections.values()).map(conn => ({
      deviceId: conn.deviceId,
      status: conn.status,
      hasSocket: !!conn.socket,
      hasMqtt: !!conn.mqtt,
      connectedAt: conn.connectedAt,
      lastSeen: conn.lastSeen
    }));
  }

  /**
   * Check if device is online
   * @param {String} deviceId - MongoDB device ID
   * @returns {Boolean}
   */
  isDeviceOnline(deviceId) {
    const conn = this.connections.get(deviceId);
    return conn && conn.status === 'online';
  }
}

// Singleton instance
const deviceConnectionManager = new DeviceConnectionManager();

module.exports = deviceConnectionManager;
