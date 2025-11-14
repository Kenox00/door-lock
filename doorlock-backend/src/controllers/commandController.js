const { VisitorLog } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');
const { sendOpenCommand, sendDenyCommand } = require('../services/mqttService');
const { notifyDoorDecision } = require('../services/socketService');
const { isValidObjectId } = require('../utils/validators');
const logger = require('../utils/logger');

/**
 * Command Controller
 * Handles admin decisions to open or deny door access
 */

/**
 * Send OPEN command to ESP32
 * POST /api/command/open
 */
const openDoor = async (req, res) => {
  try {
    const { visitorLogId, notes } = req.body;

    // Validate visitor log ID
    if (!visitorLogId || !isValidObjectId(visitorLogId)) {
      return errorResponse(res, 'Valid visitor log ID is required', 400);
    }

    // Atomic update - only update if status is still 'pending'
    const visitorLog = await VisitorLog.findOneAndUpdate(
      { 
        _id: visitorLogId, 
        status: 'pending' // Only update if still pending
      },
      {
        $set: {
          status: 'granted',
          adminId: req.user.userId,
          adminUsername: req.user.username,
          decisionTime: new Date(),
          ...(notes && { notes })
        }
      },
      { 
        new: true, // Return updated document
        runValidators: true
      }
    ).populate('deviceId');

    if (!visitorLog) {
      // Either doesn't exist or already processed
      const existing = await VisitorLog.findById(visitorLogId);
      if (!existing) {
        return errorResponse(res, 'Visitor log not found', 404);
      }
      return errorResponse(res, `Request already ${existing.status}`, 409);
    }

    // Verify user has access to this device
    const deviceAccess = visitorLog.deviceId.hasAccess(req.user.userId);
    if (!deviceAccess.hasAccess || !deviceAccess.permissions.includes('control')) {
      return errorResponse(res, 'No permission to control this device', 403);
    }

    // Send command to device via connection manager
    const deviceConnectionManager = require('../services/deviceConnectionManager');
    let commandResult = null;
    
    try {
      // Check if device is online
      if (!deviceConnectionManager.isDeviceOnline(visitorLog.deviceId._id.toString())) {
        logger.warn(`Device ${visitorLog.deviceId.name} is offline, attempting MQTT fallback`);
      }

      commandResult = await deviceConnectionManager.sendCommand(
        visitorLog.deviceId._id.toString(),
        'unlock_door',
        { duration: 5000 },
        req.user.userId
      );
    } catch (mqttError) {
      logger.error(`Failed to send command: ${mqttError.message}`);
      // Continue - log is already updated, notify user of issue
      commandResult = { error: mqttError.message };
    }

    // Notify DoorApp via Socket.IO
    notifyDoorDecision({
      visitorId: visitorLog._id,
      decision: 'granted',
      adminUsername: req.user.username,
      timestamp: new Date()
    });

    logger.info(`Door OPEN command issued by ${req.user.username} for visitor ${visitorLog._id}`);

    return successResponse(res, {
      visitorLogId: visitorLog._id,
      status: visitorLog.status,
      adminUsername: visitorLog.adminUsername,
      decisionTime: visitorLog.decisionTime,
      deviceName: visitorLog.deviceId.name,
      commandStatus: commandResult
    }, 'Door opened successfully');

  } catch (error) {
    logger.error(`Open door error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Send DENY command to ESP32
 * POST /api/command/deny
 */
const denyDoor = async (req, res) => {
  try {
    const { visitorLogId, notes } = req.body;

    // Validate visitor log ID
    if (!visitorLogId || !isValidObjectId(visitorLogId)) {
      return errorResponse(res, 'Valid visitor log ID is required', 400);
    }

    // Atomic update - only update if status is still 'pending'
    const visitorLog = await VisitorLog.findOneAndUpdate(
      { 
        _id: visitorLogId, 
        status: 'pending' 
      },
      {
        $set: {
          status: 'denied',
          adminId: req.user.userId,
          adminUsername: req.user.username,
          decisionTime: new Date(),
          ...(notes && { notes })
        }
      },
      { 
        new: true,
        runValidators: true
      }
    ).populate('deviceId');

    if (!visitorLog) {
      const existing = await VisitorLog.findById(visitorLogId);
      if (!existing) {
        return errorResponse(res, 'Visitor log not found', 404);
      }
      return errorResponse(res, `Request already ${existing.status}`, 409);
    }

    // Verify user has access to this device
    const deviceAccess = visitorLog.deviceId.hasAccess(req.user.userId);
    if (!deviceAccess.hasAccess || !deviceAccess.permissions.includes('control')) {
      return errorResponse(res, 'No permission to control this device', 403);
    }

    // Send DENY command (lock door if it's unlocked)
    const deviceConnectionManager = require('../services/deviceConnectionManager');
    let commandResult = null;
    
    try {
      commandResult = await deviceConnectionManager.sendCommand(
        visitorLog.deviceId._id.toString(),
        'lock_door',
        {},
        req.user.userId
      );
    } catch (mqttError) {
      logger.error(`Failed to send deny command: ${mqttError.message}`);
      commandResult = { error: mqttError.message };
    }

    // Notify DoorApp via Socket.IO
    notifyDoorDecision({
      visitorId: visitorLog._id,
      decision: 'denied',
      adminUsername: req.user.username,
      timestamp: new Date()
    });

    logger.info(`Door DENY command issued by ${req.user.username} for visitor ${visitorLog._id}`);

    return successResponse(res, {
      visitorLogId: visitorLog._id,
      status: visitorLog.status,
      adminUsername: visitorLog.adminUsername,
      decisionTime: visitorLog.decisionTime,
      deviceName: visitorLog.deviceId.name,
      commandStatus: commandResult
    }, 'Access denied successfully');

  } catch (error) {
    logger.error(`Deny door error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get command history
 * GET /api/command/history
 */
const getCommandHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = { status: { $ne: 'pending' } }; // Exclude pending

    const total = await VisitorLog.countDocuments(filter);

    const history = await VisitorLog.find(filter)
      .populate('deviceId', 'name espId')
      .populate('adminId', 'username email')
      .sort({ decisionTime: -1 })
      .skip(skip)
      .limit(limitNum);

    return successResponse(res, {
      history,
      pagination: {
        currentPage: pageNum,
        itemsPerPage: limitNum,
        totalItems: total,
        totalPages: Math.ceil(total / limitNum)
      }
    }, 'Command history retrieved successfully');

  } catch (error) {
    logger.error(`Get command history error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  openDoor,
  denyDoor,
  getCommandHistory
};
