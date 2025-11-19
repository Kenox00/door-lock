const { Device } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');
const { validateRequiredFields, isValidObjectId } = require('../utils/validators');
const { notifyDeviceStatus } = require('../services/socketService');
const { generateDeviceToken, generateDeviceQRData } = require('../services/qrService');
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
    const { name, espId, location, firmwareVersion, metadata, deviceType, room } = req.body;

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
    const deviceToken = generateDeviceToken();

    // Create new device - assign to current user
    const device = new Device({
      userId: req.user.userId,
      name,
      espId: espId.toUpperCase(),
      deviceType: deviceType || 'door-lock',
      deviceToken,
      room: room || location, // Use room if provided, fallback to location
      location,
      firmwareVersion,
      metadata,
      status: 'offline', // Start as offline until activated
      activated: false,
      online: false,
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

    // Generate QR code data
    const qrData = await generateDeviceQRData(device);

    return successResponse(res, {
      id: device._id,
      name: device.name,
      espId: device.espId,
      deviceType: device.deviceType,
      deviceToken,
      room: device.room,
      location: device.location,
      status: device.status,
      activated: device.activated,
      createdAt: device.createdAt,
      qrCode: qrData.qrCode,
      onboardingURL: qrData.onboardingURL
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

/**
 * Get device QR code
 * GET /api/device/:id/qr
 */
const getDeviceQR = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid device ID', 400);
    }

    const device = await Device.findById(id).select('+deviceToken');

    if (!device) {
      return errorResponse(res, 'Device not found', 404);
    }

    const access = device.hasAccess(req.user.userId);
    if (!access.hasAccess) {
      return errorResponse(res, 'No access to this device', 403);
    }

    // Generate QR code data
    const qrData = await generateDeviceQRData(device);

    return successResponse(res, qrData, 'QR code generated successfully');

  } catch (error) {
    logger.error(`Get device QR error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Activate device (called when QR is scanned)
 * POST /api/device/activate
 */
const activateDevice = async (req, res) => {
  try {
    const { deviceId, token } = req.body;

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['deviceId', 'token']);
    if (!validation.isValid) {
      return errorResponse(res, `Missing required fields: ${validation.missing.join(', ')}`, 400);
    }

    if (!isValidObjectId(deviceId)) {
      return errorResponse(res, 'Invalid device ID', 400);
    }

    // Find device with token
    const device = await Device.findById(deviceId).select('+deviceToken');

    if (!device) {
      return errorResponse(res, 'Device not found', 404);
    }

    // Validate token
    if (device.deviceToken !== token) {
      logger.warn(`Invalid token for device activation: ${deviceId}`);
      return errorResponse(res, 'Invalid device token', 401);
    }

    // Check if already activated
    if (device.activated) {
      return successResponse(res, {
        deviceId: device._id,
        name: device.name,
        deviceType: device.deviceType,
        room: device.room,
        activated: true,
        activatedAt: device.activatedAt,
        message: 'Device already activated'
      }, 'Device already activated');
    }

    // Activate device
    device.activated = true;
    device.activatedAt = new Date();
    device.status = 'offline'; // Will be marked online when WebSocket connects
    await device.save();

    logger.info(`Device activated: ${device.name} (${device.espId})`);

    // Notify clients about device activation
    notifyDeviceStatus({
      deviceId: device._id,
      deviceName: device.name,
      status: 'activated',
      lastSeen: device.lastSeen
    });

    return successResponse(res, {
      deviceId: device._id,
      name: device.name,
      deviceType: device.deviceType,
      room: device.room,
      activated: true,
      activatedAt: device.activatedAt
    }, 'Device activated successfully');

  } catch (error) {
    logger.error(`Activate device error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Send command to device
 * POST /api/device/:id/command
 */
const sendDeviceCommand = async (req, res) => {
  try {
    const { id: deviceId } = req.params;
    const { command, payload = {} } = req.body;
    const userId = req.user.userId;

    // Validate device ID
    if (!isValidObjectId(deviceId)) {
      return errorResponse(res, 'Invalid device ID', 400);
    }

    // Validate command
    const validCommands = ['lock_door', 'unlock_door', 'request_snapshot', 'update_settings', 'restart_device', 'firmware_update'];
    if (!command || !validCommands.includes(command)) {
      return errorResponse(res, `Invalid command. Must be one of: ${validCommands.join(', ')}`, 400);
    }

    // Find device and verify access
    const device = await Device.findById(deviceId);
    if (!device) {
      return errorResponse(res, 'Device not found', 404);
    }

    // Check if user has access to this device
    const access = device.hasAccess(userId);
    if (!access.hasAccess || !access.permissions.includes('control')) {
      return errorResponse(res, 'No permission to control this device', 403);
    }

    // Send command via connection manager
    const deviceConnectionManager = require('../services/deviceConnectionManager');
    let commandResult = null;

    try {
      commandResult = await deviceConnectionManager.sendCommand(
        deviceId,
        command,
        payload,
        userId
      );

      logger.info(`Command '${command}' sent to device ${device.name} by user ${req.user.username}`);

      return successResponse(res, {
        commandId: commandResult.commandId,
        status: commandResult.status,
        deviceId: device._id,
        deviceName: device.name,
        command,
        payload,
        timestamp: new Date()
      }, 'Command sent successfully');

    } catch (commandError) {
      logger.error(`Failed to send command to device: ${commandError.message}`);
      return errorResponse(res, `Failed to send command: ${commandError.message}`, 500);
    }

  } catch (error) {
    logger.error(`Send device command error: ${error.message}`);
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
  getDeviceStats,
  getDeviceQR,
  activateDevice,
  sendDeviceCommand
};
