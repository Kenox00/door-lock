const { getIO, emitToRoom, emitToAll, SOCKET_EVENTS } = require('../config/socket');
const logger = require('../utils/logger');

/**
 * Socket.IO Service
 * Handles real-time communication with client applications
 */

/**
 * Emit new visitor event to Admin app
 * @param {Object} visitorData - Visitor log data
 */
const notifyNewVisitor = (visitorData) => {
  try {
    const eventData = {
      visitorId: visitorData._id,
      imageUrl: visitorData.imageUrl,
      deviceId: visitorData.deviceId,
      deviceName: visitorData.deviceName,
      timestamp: visitorData.timestamp,
      status: visitorData.status
    };
    
    logger.info(`📡 Emitting NEW_VISITOR event to 'admin' room`);
    logger.info(`Event data: ${JSON.stringify(eventData)}`);
    
    emitToRoom('admin', SOCKET_EVENTS.NEW_VISITOR, eventData);

    logger.info(`✅ New visitor notification sent to admins: ${visitorData._id}`);
  } catch (error) {
    logger.error(`❌ Failed to notify new visitor: ${error.message}`);
  }
};

/**
 * Emit door decision event to Door app
 * @param {Object} decisionData - Decision data
 */
const notifyDoorDecision = (decisionData) => {
  try {
    emitToRoom('door', SOCKET_EVENTS.DOOR_DECISION, {
      visitorId: decisionData.visitorId,
      decision: decisionData.decision, // 'granted' or 'denied'
      adminUsername: decisionData.adminUsername,
      timestamp: decisionData.timestamp
    });

    logger.info(`Door decision sent to DoorApp: ${decisionData.decision}`);
  } catch (error) {
    logger.error(`Failed to notify door decision: ${error.message}`);
  }
};

/**
 * Emit device status update
 * @param {Object} deviceData - Device status data
 */
const notifyDeviceStatus = (deviceData) => {
  try {
    emitToAll(SOCKET_EVENTS.DEVICE_STATUS, {
      deviceId: deviceData.deviceId,
      deviceName: deviceData.deviceName,
      status: deviceData.status,
      lastSeen: deviceData.lastSeen
    });

    logger.info(`Device status update sent: ${deviceData.deviceId} - ${deviceData.status}`);
  } catch (error) {
    logger.error(`Failed to notify device status: ${error.message}`);
  }
};

/**
 * Send custom event to specific room
 * @param {String} room - Room name
 * @param {String} event - Event name
 * @param {Object} data - Event data
 */
const sendToRoom = (room, event, data) => {
  try {
    emitToRoom(room, event, data);
    logger.info(`Custom event ${event} sent to room ${room}`);
  } catch (error) {
    logger.error(`Failed to send custom event: ${error.message}`);
  }
};

/**
 * Broadcast event to all clients
 * @param {String} event - Event name
 * @param {Object} data - Event data
 */
const broadcast = (event, data) => {
  try {
    emitToAll(event, data);
    logger.info(`Event ${event} broadcasted to all clients`);
  } catch (error) {
    logger.error(`Failed to broadcast event: ${error.message}`);
  }
};

/**
 * Get connected clients count
 * @returns {Number}
 */
const getConnectedClientsCount = () => {
  try {
    const io = getIO();
    return io.engine.clientsCount;
  } catch (error) {
    logger.error(`Failed to get connected clients count: ${error.message}`);
    return 0;
  }
};

/**
 * Get clients in specific room
 * @param {String} room - Room name
 * @returns {Array}
 */
const getClientsInRoom = async (room) => {
  try {
    const io = getIO();
    const sockets = await io.in(room).fetchSockets();
    return sockets.map(socket => socket.id);
  } catch (error) {
    logger.error(`Failed to get clients in room: ${error.message}`);
    return [];
  }
};

module.exports = {
  notifyNewVisitor,
  notifyDoorDecision,
  notifyDeviceStatus,
  sendToRoom,
  broadcast,
  getConnectedClientsCount,
  getClientsInRoom
};
