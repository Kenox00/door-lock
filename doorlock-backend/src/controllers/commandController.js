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

    // Find visitor log
    const visitorLog = await VisitorLog.findById(visitorLogId).populate('deviceId');

    if (!visitorLog) {
      return errorResponse(res, 'Visitor log not found', 404);
    }

    if (visitorLog.status !== 'pending') {
      return errorResponse(res, `Request already ${visitorLog.status}`, 400);
    }

    // Update visitor log
    visitorLog.status = 'granted';
    visitorLog.adminId = req.user.userId;
    visitorLog.adminUsername = req.user.username;
    visitorLog.decisionTime = new Date();
    if (notes) {
      visitorLog.notes = notes;
    }

    await visitorLog.save();

    // Send MQTT command to ESP32
    try {
      await sendOpenCommand(visitorLog.deviceId.espId);
    } catch (mqttError) {
      logger.error(`MQTT command failed: ${mqttError.message}`);
      // Continue anyway - log is updated
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
      deviceName: visitorLog.deviceId.name
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

    // Find visitor log
    const visitorLog = await VisitorLog.findById(visitorLogId).populate('deviceId');

    if (!visitorLog) {
      return errorResponse(res, 'Visitor log not found', 404);
    }

    if (visitorLog.status !== 'pending') {
      return errorResponse(res, `Request already ${visitorLog.status}`, 400);
    }

    // Update visitor log
    visitorLog.status = 'denied';
    visitorLog.adminId = req.user.userId;
    visitorLog.adminUsername = req.user.username;
    visitorLog.decisionTime = new Date();
    if (notes) {
      visitorLog.notes = notes;
    }

    await visitorLog.save();

    // Send MQTT command to ESP32
    try {
      await sendDenyCommand(visitorLog.deviceId.espId);
    } catch (mqttError) {
      logger.error(`MQTT command failed: ${mqttError.message}`);
      // Continue anyway - log is updated
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
      deviceName: visitorLog.deviceId.name
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
