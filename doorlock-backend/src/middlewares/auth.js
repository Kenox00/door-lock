const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');
const { User, Device } = require('../models');
const logger = require('../utils/logger');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'No token provided', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return errorResponse(res, 'User not found', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'User account is inactive', 401);
    }

    // Attach user to request
    req.user = {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token', 401);
  }
};

/**
 * Device Authentication Middleware
 * Verifies device token and attaches device to request
 */
const authenticateDevice = async (req, res, next) => {
  try {
    const deviceId = req.headers['x-device-id'];
    const deviceToken = req.headers['x-device-token'];
    
    if (!deviceId || !deviceToken) {
      return errorResponse(res, 'Device ID and token required', 401);
    }

    // Find device and validate token
    const device = await Device.findById(deviceId).select('+deviceToken');
    
    if (!device) {
      logger.warn(`Device authentication failed: Device not found (${deviceId})`);
      return errorResponse(res, 'Device not found', 404);
    }

    if (device.deviceToken !== deviceToken) {
      logger.warn(`Device authentication failed: Invalid token for device ${deviceId}`);
      return errorResponse(res, 'Invalid device token', 401);
    }

    if (!device.activated) {
      logger.warn(`Device authentication failed: Device not activated (${deviceId})`);
      return errorResponse(res, 'Device not activated', 403);
    }

    // Attach device info to request
    req.device = {
      deviceId: device._id,
      userId: device.userId,
      name: device.name,
      espId: device.espId,
      deviceType: device.deviceType
    };

    logger.info(`Device authenticated: ${device.name} (${device.espId})`);
    next();

  } catch (error) {
    logger.error(`Device authentication error: ${error.message}`);
    return errorResponse(res, 'Device authentication failed', 401);
  }
};

/**
 * Flexible Authentication - supports both JWT and Device Token
 * Tries JWT first, then device token
 */
const flexAuth = async (req, res, next) => {
  try {
    // Try JWT authentication first
    const authHeader = req.headers.authorization;
    const deviceId = req.headers['x-device-id'];
    const deviceToken = req.headers['x-device-token'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // JWT authentication
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = {
          userId: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        };
        return next();
      }
    }

    if (deviceId && deviceToken) {
      // Device token authentication
      const device = await Device.findById(deviceId).select('+deviceToken');
      
      if (device && device.deviceToken === deviceToken && device.activated) {
        req.device = {
          deviceId: device._id,
          userId: device.userId,
          name: device.name,
          espId: device.espId,
          deviceType: device.deviceType
        };
        return next();
      }
    }

    return errorResponse(res, 'Authentication required', 401);

  } catch (error) {
    return errorResponse(res, 'Authentication failed', 401);
  }
};

/**
 * Authorization Middleware
 * Checks if user has required role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 'Insufficient permissions', 403);
    }

    next();
  };
};

/**
 * Optional Authentication
 * Attaches user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = {
          userId: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        };
      }
    }
  } catch (error) {
    // Ignore errors in optional auth
  }
  
  next();
};

module.exports = {
  authenticate,
  authenticateDevice,
  flexAuth,
  authorize,
  optionalAuth
};
