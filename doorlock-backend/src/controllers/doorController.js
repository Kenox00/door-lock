const { VisitorLog, Device } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { uploadImage } = require('../services/cloudinaryService');
const { notifyNewVisitor } = require('../services/socketService');
const { validateRequiredFields, isValidObjectId } = require('../utils/validators');
const logger = require('../utils/logger');

/**
 * Door Controller
 * Handles visitor photo uploads and log retrieval
 */

/**
 * Upload visitor photo
 * POST /api/door/upload
 */
const uploadVisitorPhoto = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return errorResponse(res, 'No image file uploaded', 400);
    }

    const { deviceId } = req.body;

    // Validate device ID
    if (!deviceId || !isValidObjectId(deviceId)) {
      return errorResponse(res, 'Valid device ID is required', 400);
    }

    // Check if device exists
    const device = await Device.findById(deviceId);
    if (!device) {
      return errorResponse(res, 'Device not found', 404);
    }

    // Upload image to Cloudinary
    const uploadResult = await uploadImage(req.file.path);

    // Create visitor log entry
    const visitorLog = new VisitorLog({
      imageUrl: uploadResult.url,
      imagePublicId: uploadResult.publicId,
      deviceId: device._id,
      deviceName: device.name,
      status: 'pending',
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    await visitorLog.save();

    // Update device last seen
    await device.updateLastSeen();

    logger.info(`Visitor photo uploaded: ${visitorLog._id} from device ${device.name}`);

    // Send real-time notification to Admin app
    notifyNewVisitor({
      _id: visitorLog._id,
      imageUrl: visitorLog.imageUrl,
      deviceId: visitorLog.deviceId,
      deviceName: visitorLog.deviceName,
      timestamp: visitorLog.timestamp,
      status: visitorLog.status
    });

    return successResponse(res, {
      visitorLogId: visitorLog._id,
      imageUrl: visitorLog.imageUrl,
      deviceName: visitorLog.deviceName,
      status: visitorLog.status,
      timestamp: visitorLog.timestamp
    }, 'Visitor photo uploaded successfully', 201);

  } catch (error) {
    logger.error(`Upload visitor photo error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get all visitor logs with pagination
 * GET /api/door/logs
 */
const getVisitorLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      deviceId, 
      startDate, 
      endDate 
    } = req.query;

    // Build filter query
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (deviceId && isValidObjectId(deviceId)) {
      filter.deviceId = deviceId;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await VisitorLog.countDocuments(filter);

    // Get visitor logs
    const logs = await VisitorLog.find(filter)
      .populate('deviceId', 'name espId status')
      .populate('adminId', 'username email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    logger.info(`Retrieved ${logs.length} visitor logs`);

    return paginatedResponse(res, logs, pageNum, limitNum, total, 'Visitor logs retrieved successfully');

  } catch (error) {
    logger.error(`Get visitor logs error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get single visitor log by ID
 * GET /api/door/logs/:id
 */
const getVisitorLogById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid visitor log ID', 400);
    }

    const log = await VisitorLog.findById(id)
      .populate('deviceId', 'name espId status location')
      .populate('adminId', 'username email role');

    if (!log) {
      return errorResponse(res, 'Visitor log not found', 404);
    }

    return successResponse(res, log, 'Visitor log retrieved successfully');

  } catch (error) {
    logger.error(`Get visitor log by ID error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get pending visitor logs
 * GET /api/door/logs/pending
 */
const getPendingLogs = async (req, res) => {
  try {
    const logs = await VisitorLog.find({ status: 'pending' })
      .populate('deviceId', 'name espId status')
      .sort({ timestamp: -1 })
      .limit(50);

    return successResponse(res, logs, 'Pending visitor logs retrieved successfully');

  } catch (error) {
    logger.error(`Get pending logs error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get visitor statistics
 * GET /api/door/stats
 */
const getVisitorStats = async (req, res) => {
  try {
    const { startDate, endDate, deviceId } = req.query;

    const filter = {};

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    if (deviceId && isValidObjectId(deviceId)) {
      filter.deviceId = deviceId;
    }

    const stats = await VisitorLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await VisitorLog.countDocuments(filter);

    const formattedStats = {
      total,
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      granted: stats.find(s => s._id === 'granted')?.count || 0,
      denied: stats.find(s => s._id === 'denied')?.count || 0
    };

    return successResponse(res, formattedStats, 'Statistics retrieved successfully');

  } catch (error) {
    logger.error(`Get visitor stats error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  uploadVisitorPhoto,
  getVisitorLogs,
  getVisitorLogById,
  getPendingLogs,
  getVisitorStats
};
