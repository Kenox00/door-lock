const { DeviceEvent, VisitorLog, Device } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { validateRequiredFields, isValidObjectId } = require('../utils/validators');
const logger = require('../utils/logger');

/**
 * Logs Controller
 * Handles all activity logs including device events and visitor logs
 */

/**
 * Get all logs (unified endpoint for device events and visitor logs)
 * GET /api/logs
 */
const getAllLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type,
      deviceId,
      startDate,
      endDate,
      eventType
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let logs = [];
    let total = 0;

    // Build filter for device access
    const userDevices = await Device.find({
      $or: [
        { userId: req.user.userId },
        { 'sharedWith.userId': req.user.userId }
      ]
    }).select('_id');

    const deviceIds = userDevices.map(d => d._id);

    if (type === 'visitor' || type === 'door') {
      // Get visitor logs
      const filter = { deviceId: { $in: deviceIds } };
      
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      if (deviceId && isValidObjectId(deviceId)) {
        filter.deviceId = deviceId;
      }

      total = await VisitorLog.countDocuments(filter);
      const visitorLogs = await VisitorLog.find(filter)
        .populate('deviceId', 'name espId deviceType')
        .populate('adminId', 'username')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum);

      logs = visitorLogs.map(log => ({
        _id: log._id,
        type: 'door_event',
        eventType: log.status,
        deviceId: log.deviceId?._id,
        deviceName: log.deviceId?.name || log.deviceName,
        deviceType: log.deviceId?.deviceType || 'door-lock',
        message: `Door visitor ${log.status}`,
        imageUrl: log.imageUrl,
        status: log.status,
        adminUsername: log.adminUsername,
        timestamp: log.timestamp,
        metadata: {
          visitorLogId: log._id,
          notes: log.notes
        }
      }));
    } else if (type === 'device' || type === 'activity' || !type) {
      // Get device events
      const filter = { deviceId: { $in: deviceIds } };

      if (eventType) {
        filter.eventType = eventType;
      }

      if (deviceId && isValidObjectId(deviceId)) {
        filter.deviceId = deviceId;
      }

      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      total = await DeviceEvent.countDocuments(filter);
      const deviceEvents = await DeviceEvent.find(filter)
        .populate('deviceId', 'name espId deviceType')
        .populate('userId', 'username')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum);

      logs = deviceEvents.map(event => ({
        _id: event._id,
        type: 'device_event',
        eventType: event.eventType,
        deviceId: event.deviceId?._id,
        deviceName: event.deviceId?.name,
        deviceType: event.deviceId?.deviceType,
        message: getEventMessage(event.eventType, event.payload),
        userId: event.userId?._id,
        username: event.userId?.username,
        payload: event.payload,
        timestamp: event.timestamp,
        metadata: event.metadata
      }));
    }

    return paginatedResponse(res, logs, pageNum, limitNum, total, 'Logs retrieved successfully');

  } catch (error) {
    logger.error(`Get all logs error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get logs by device
 * GET /api/logs/device/:deviceId
 */
const getLogsByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    if (!isValidObjectId(deviceId)) {
      return errorResponse(res, 'Invalid device ID', 400);
    }

    const device = await Device.findById(deviceId);
    if (!device) {
      return errorResponse(res, 'Device not found', 404);
    }

    // Check access
    const access = device.hasAccess(req.user.userId);
    if (!access.hasAccess) {
      return errorResponse(res, 'No access to this device', 403);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = { deviceId };
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Get both device events and visitor logs
    const [deviceEvents, visitorLogs, totalEvents, totalVisitors] = await Promise.all([
      DeviceEvent.find(filter)
        .populate('userId', 'username')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Math.floor(limitNum / 2)),
      VisitorLog.find(filter)
        .populate('adminId', 'username')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Math.ceil(limitNum / 2)),
      DeviceEvent.countDocuments(filter),
      VisitorLog.countDocuments(filter)
    ]);

    // Combine and sort by timestamp
    const combinedLogs = [
      ...deviceEvents.map(event => ({
        _id: event._id,
        type: 'device_event',
        eventType: event.eventType,
        deviceId: event.deviceId,
        deviceName: device.name,
        message: getEventMessage(event.eventType, event.payload),
        username: event.userId?.username,
        timestamp: event.timestamp,
        metadata: event.metadata
      })),
      ...visitorLogs.map(log => ({
        _id: log._id,
        type: 'door_event',
        eventType: log.status,
        deviceId: log.deviceId,
        deviceName: device.name,
        message: `Door visitor ${log.status}`,
        imageUrl: log.imageUrl,
        status: log.status,
        adminUsername: log.adminUsername,
        timestamp: log.timestamp
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const total = totalEvents + totalVisitors;

    return paginatedResponse(res, combinedLogs, pageNum, limitNum, total, 'Device logs retrieved successfully');

  } catch (error) {
    logger.error(`Get logs by device error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get activity logs (device events only)
 * GET /api/logs/activity
 */
const getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, eventType } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get user's devices
    const userDevices = await Device.find({
      $or: [
        { userId: req.user.userId },
        { 'sharedWith.userId': req.user.userId }
      ]
    }).select('_id');

    const deviceIds = userDevices.map(d => d._id);

    const filter = { deviceId: { $in: deviceIds } };
    if (eventType) {
      filter.eventType = eventType;
    }

    const total = await DeviceEvent.countDocuments(filter);
    const events = await DeviceEvent.find(filter)
      .populate('deviceId', 'name espId deviceType')
      .populate('userId', 'username')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    const logs = events.map(event => ({
      _id: event._id,
      type: 'device_event',
      eventType: event.eventType,
      deviceId: event.deviceId?._id,
      deviceName: event.deviceId?.name,
      deviceType: event.deviceId?.deviceType,
      message: getEventMessage(event.eventType, event.payload),
      username: event.userId?.username,
      payload: event.payload,
      timestamp: event.timestamp,
      metadata: event.metadata
    }));

    return paginatedResponse(res, logs, pageNum, limitNum, total, 'Activity logs retrieved successfully');

  } catch (error) {
    logger.error(`Get activity logs error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get visitor logs
 * GET /api/logs/visitors
 */
const getVisitorLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, deviceId } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get user's devices
    const userDevices = await Device.find({
      $or: [
        { userId: req.user.userId },
        { 'sharedWith.userId': req.user.userId }
      ]
    }).select('_id');

    const deviceIds = userDevices.map(d => d._id);

    const filter = { deviceId: { $in: deviceIds } };
    if (status) {
      filter.status = status;
    }
    if (deviceId && isValidObjectId(deviceId)) {
      filter.deviceId = deviceId;
    }

    const total = await VisitorLog.countDocuments(filter);
    const logs = await VisitorLog.find(filter)
      .populate('deviceId', 'name espId deviceType')
      .populate('adminId', 'username')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    return paginatedResponse(res, logs, pageNum, limitNum, total, 'Visitor logs retrieved successfully');

  } catch (error) {
    logger.error(`Get visitor logs error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get logs by type
 * GET /api/logs/type/:type
 */
const getLogsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get user's devices
    const userDevices = await Device.find({
      $or: [
        { userId: req.user.userId },
        { 'sharedWith.userId': req.user.userId }
      ]
    }).select('_id');

    const deviceIds = userDevices.map(d => d._id);

    const filter = { 
      deviceId: { $in: deviceIds },
      eventType: type
    };

    const total = await DeviceEvent.countDocuments(filter);
    const events = await DeviceEvent.find(filter)
      .populate('deviceId', 'name espId deviceType')
      .populate('userId', 'username')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    const logs = events.map(event => ({
      _id: event._id,
      type: 'device_event',
      eventType: event.eventType,
      deviceId: event.deviceId?._id,
      deviceName: event.deviceId?.name,
      message: getEventMessage(event.eventType, event.payload),
      username: event.userId?.username,
      payload: event.payload,
      timestamp: event.timestamp
    }));

    return paginatedResponse(res, logs, pageNum, limitNum, total, 'Logs retrieved successfully');

  } catch (error) {
    logger.error(`Get logs by type error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Clear old logs
 * DELETE /api/logs
 */
const clearLogs = async (req, res) => {
  try {
    const { beforeDate } = req.body;

    if (!beforeDate) {
      return errorResponse(res, 'beforeDate is required', 400);
    }

    const deleteDate = new Date(beforeDate);
    
    // Only allow clearing logs older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (deleteDate > sevenDaysAgo) {
      return errorResponse(res, 'Can only delete logs older than 7 days', 400);
    }

    // Get user's devices
    const userDevices = await Device.find({
      userId: req.user.userId // Only owner can delete logs
    }).select('_id');

    const deviceIds = userDevices.map(d => d._id);

    const [eventsDeleted, logsDeleted] = await Promise.all([
      DeviceEvent.deleteMany({
        deviceId: { $in: deviceIds },
        timestamp: { $lt: deleteDate }
      }),
      VisitorLog.deleteMany({
        deviceId: { $in: deviceIds },
        timestamp: { $lt: deleteDate }
      })
    ]);

    logger.info(`Cleared ${eventsDeleted.deletedCount} device events and ${logsDeleted.deletedCount} visitor logs for user ${req.user.username}`);

    return successResponse(res, {
      eventsDeleted: eventsDeleted.deletedCount,
      logsDeleted: logsDeleted.deletedCount,
      total: eventsDeleted.deletedCount + logsDeleted.deletedCount
    }, 'Logs cleared successfully');

  } catch (error) {
    logger.error(`Clear logs error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Helper function to generate human-readable event messages
 */
function getEventMessage(eventType, payload = {}) {
  const messages = {
    'device_connected': 'Device connected',
    'device_disconnected': 'Device disconnected',
    'command_sent': `Command sent: ${payload.command || 'unknown'}`,
    'command_received': `Command received: ${payload.command || 'unknown'}`,
    'command_executed': `Command executed: ${payload.command || 'unknown'}`,
    'command_failed': `Command failed: ${payload.error || 'unknown error'}`,
    'status_changed': `Status changed to ${payload.status || 'unknown'}`,
    'snapshot_captured': 'Snapshot captured',
    'motion_detected': 'Motion detected',
    'low_battery': `Low battery: ${payload.level || 'unknown'}%`,
    'error_occurred': `Error: ${payload.error || 'unknown error'}`,
    'settings_updated': 'Settings updated',
    'firmware_updated': `Firmware updated to ${payload.version || 'unknown'}`
  };

  return messages[eventType] || `Event: ${eventType}`;
}

module.exports = {
  getAllLogs,
  getLogsByDevice,
  getActivityLogs,
  getVisitorLogs,
  getLogsByType,
  clearLogs
};
