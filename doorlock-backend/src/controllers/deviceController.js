const { Device } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');
const { validateRequiredFields, isValidObjectId } = require('../utils/validators');
const { notifyDeviceStatus } = require('../services/socketService');
const logger = require('../utils/logger');

/**
 * Device Controller
 * Manages ESP32 devices registration and status
 */

/**
 * Register new device
 * POST /api/device/register
 */
const registerDevice = async (req, res) => {
  try {
    const { name, espId, location, firmwareVersion, metadata, deviceType } = req.body;

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['name', 'espId']);
    if (!validation.isValid) {
      return errorResponse(res, `Missing required fields: ${validation.missing.join(', ')}`, 400);
    }

    // Check if device already exists
    const existingDevice = await Device.findOne({ espId: espId.toUpperCase() });
    if (existingDevice) {
      return errorResponse(res, 'Device with this ESP ID already exists', 400);
    }

    // Generate device token for authentication
    const crypto = require('crypto');
    const deviceToken = crypto.randomBytes(32).toString('hex');

    // Create new device - assign to current user
    const device = new Device({
      userId: req.user.userId,
      name,
      espId: espId.toUpperCase(),
      deviceType: deviceType || 'door-lock',
      deviceToken,
      location,
      firmwareVersion,
      metadata,
      status: 'online',
      lastSeen: new Date()
    });

    await device.save();

    logger.info(`New device registered: ${device.name} (${device.espId}) by user ${req.user.username}`);

    // Notify clients about new device
    notifyDeviceStatus({
      deviceId: device._id,
      deviceName: device.name,
      status: device.status,
      lastSeen: device.lastSeen
    });

    return successResponse(res, {
      id: device._id,
      name: device.name,
      espId: device.espId,
      deviceType: device.deviceType,
      deviceToken,
      location: device.location,
      status: device.status,
      createdAt: device.createdAt
    }, 'Device registered successfully', 201);

  } catch (error) {
    logger.error(`Register device error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get all devices
 * GET /api/device
 */
const getAllDevices = async (req, res) => {
  try {
    const { status, isActive } = req.query;

    const filter = {
      $or: [
        { userId: req.user.userId },
        { 'sharedWith.userId': req.user.userId }
      ]
    };
    if (status) filter.status = status;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const devices = await Device.find(filter).select('-deviceToken').sort({ createdAt: -1 });

    return successResponse(res, devices, 'Devices retrieved successfully');

  } catch (error) {
    logger.error(`Get all devices error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get device by ID
 * GET /api/device/:id
 */
const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid device ID', 400);
    }

    const device = await Device.findById(id).select('-deviceToken');

    if (!device) {
      return errorResponse(res, 'Device not found', 404);
    }

    const access = device.hasAccess(req.user.userId);
    if (!access.hasAccess) {
      return errorResponse(res, 'No access to this device', 403);
    }

    return successResponse(res, {
      ...device.toObject(),
      userPermissions: access.permissions
    }, 'Device retrieved successfully');

  } catch (error) {
    logger.error(`Get device by ID error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update device
 * PUT /api/device/:id
 */
const updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, firmwareVersion, settings, isActive } = req.body;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid device ID', 400);
    }

    const device = await Device.findById(id);

    if (!device) {
      return errorResponse(res, 'Device not found', 404);
    }

    const access = device.hasAccess(req.user.userId);
    if (!access.hasAccess || !access.permissions.includes('control')) {
      return errorResponse(res, 'No permission to update this device', 403);
    }

    // Update fields
    if (name) device.name = name;
    if (location) device.location = location;
    if (firmwareVersion) device.firmwareVersion = firmwareVersion;
    if (settings) device.settings = { ...device.settings, ...settings };
    if (isActive !== undefined) device.isActive = isActive;

    await device.save();

    logger.info(`Device updated: ${device.name} (${device.espId})`);

    return successResponse(res, device, 'Device updated successfully');

  } catch (error) {
    logger.error(`Update device error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update device status (heartbeat)
 * POST /api/device/:id/heartbeat
 */
const deviceHeartbeat = async (req, res) => {
  try {
    const { id } = req.params;
    const { metadata } = req.body;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid device ID', 400);
    }

    const device = await Device.findById(id);

    if (!device) {
      return errorResponse(res, 'Device not found', 404);
    }

    // Update last seen and status
    device.lastSeen = new Date();
    device.status = 'online';
    
    if (metadata) {
      device.metadata = { ...device.metadata, ...metadata };
    }

    await device.save();

    // Notify clients about device status
    notifyDeviceStatus({
      deviceId: device._id,
      deviceName: device.name,
      status: device.status,
      lastSeen: device.lastSeen
    });

    return successResponse(res, {
      status: device.status,
      lastSeen: device.lastSeen
    }, 'Heartbeat received');

  } catch (error) {
    logger.error(`Device heartbeat error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete device
 * DELETE /api/device/:id
 */
const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid device ID', 400);
    }

    const device = await Device.findById(id);

    if (!device) {
      return errorResponse(res, 'Device not found', 404);
    }

    if (device.userId.toString() !== req.user.userId.toString()) {
      return errorResponse(res, 'Only device owner can delete', 403);
    }

    await Device.findByIdAndDelete(id);

    logger.info(`Device deleted: ${device.name} (${device.espId})`);

    return successResponse(res, null, 'Device deleted successfully');

  } catch (error) {
    logger.error(`Delete device error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get device statistics
 * GET /api/device/stats
 */
const getDeviceStats = async (req, res) => {
  try {
    const userFilter = {
      $or: [
        { userId: req.user.userId },
        { 'sharedWith.userId': req.user.userId }
      ]
    };

    const total = await Device.countDocuments(userFilter);
    const online = await Device.countDocuments({ ...userFilter, status: 'online' });
    const offline = await Device.countDocuments({ ...userFilter, status: 'offline' });
    const maintenance = await Device.countDocuments({ ...userFilter, status: 'maintenance' });
    const owned = await Device.countDocuments({ userId: req.user.userId });
    const shared = await Device.countDocuments({ 'sharedWith.userId': req.user.userId });

    return successResponse(res, {
      total,
      online,
      offline,
      maintenance,
      owned,
      shared,
      active: await Device.countDocuments({ ...userFilter, isActive: true })
    }, 'Device statistics retrieved successfully');

  } catch (error) {
    logger.error(`Get device stats error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  registerDevice,
  getAllDevices,
  getDeviceById,
  updateDevice,
  deviceHeartbeat,
  deleteDevice,
  getDeviceStats
};
