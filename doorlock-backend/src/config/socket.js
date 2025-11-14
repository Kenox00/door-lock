const { Server } = require('socket.io');
const logger = require('../utils/logger');
const { verifyToken } = require('../utils/jwt');
const { User, Device } = require('../models');
const deviceConnectionManager = require('../services/deviceConnectionManager');
const { validateMessage } = require('../validators/messageSchemas');

let io = null;

/**
 * Socket.IO Events used in the system
 */
const SOCKET_EVENTS = {
  // Device → Backend
  DEVICE_REGISTER: 'device_register',
  DEVICE_HEARTBEAT: 'device_heartbeat',
  DOOR_STATUS_CHANGED: 'door_status_changed',
  SNAPSHOT_READY: 'snapshot_ready',
  MOTION_DETECTED: 'motion_detected',
  LOW_BATTERY: 'low_battery',
  ERROR_OCCURRED: 'error_occurred',
  COMMAND_ACK: 'command_ack',
  
  // Backend → Device
  LOCK_DOOR: 'lock_door',
  UNLOCK_DOOR: 'unlock_door',
  REQUEST_SNAPSHOT: 'request_snapshot',
  UPDATE_SETTINGS: 'update_settings',
  RESTART_DEVICE: 'restart_device',
  FIRMWARE_UPDATE: 'firmware_update',
  
  // Backend → Dashboard
  NEW_VISITOR: 'new_visitor',
  VISITOR_PROCESSED: 'visitor_processed',
  DEVICE_CONNECTED: 'device_connected',
  DEVICE_DISCONNECTED: 'device_disconnected',
  DEVICE_STATUS: 'device_status',
  COMMAND_STATUS: 'command_status',
  SYSTEM_ALERT: 'system_alert',
  
  // Dashboard → Backend
  AUTHENTICATE: 'authenticate',
  SUBSCRIBE_DEVICE: 'subscribe_device',
  UNSUBSCRIBE_DEVICE: 'unsubscribe_device',
  SEND_COMMAND: 'send_command',
  REQUEST_DEVICE_STATUS: 'request_device_status',
  VISITOR_APPROVAL: 'visitor_approval',
  VISITOR_REJECTION: 'visitor_rejection',
  
  // Backend → Camera Device (for approval/rejection response)
  ACCESS_GRANTED: 'access_granted',
  ACCESS_DENIED: 'access_denied',
  
  // Legacy (for backward compatibility)
  DOOR_DECISION: 'door_decision'
};

/**
 * Authentication middleware for Socket.IO
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      logger.warn(`Socket connection rejected: No token provided (${socket.id})`);
      return next(new Error('Authentication required'));
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Check if user exists and is active
    const user = await User.findById(decoded.userId);
    if (!user) {
      logger.warn(`Socket connection rejected: User not found (${socket.id})`);
      return next(new Error('Invalid user'));
    }

    // Attach user info to socket
    socket.userId = user._id.toString();
    socket.userRole = user.role;
    socket.username = user.username;
    socket.clientType = socket.handshake.auth.clientType || 'dashboard';
    
    logger.info(`Socket authenticated: ${socket.id} - User: ${user.username}, Role: ${user.role}`);
    next();

  } catch (error) {
    logger.error(`Socket authentication error: ${error.message}`);
    next(new Error('Invalid token'));
  }
};

/**
 * Initialize Socket.IO server
 * @param {Object} httpServer - HTTP server instance
 */
const initSocketIO = (httpServer) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // Apply authentication middleware
  io.use(authenticateSocket);

  // Connection handling
  io.on('connection', async (socket) => {
    try {
      logger.info(`Client connected: ${socket.id} - User: ${socket.username}, Type: ${socket.clientType}`);

      // Join user-specific room
      socket.join(`user:${socket.userId}`);

      // If device client, handle device registration
      if (socket.clientType === 'device') {
        await handleDeviceConnection(socket);
      } else {
        // Dashboard client - join their device rooms
        await handleDashboardConnection(socket);
      }

      // Set up event handlers
      setupSocketHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', async (reason) => {
        await handleDisconnection(socket, reason);
      });

      socket.on('error', (error) => {
        logger.error(`Socket error (${socket.id}): ${error.message}`);
      });

    } catch (error) {
      logger.error(`Error handling socket connection: ${error.message}`);
      socket.disconnect();
    }
  });

  logger.info('Socket.IO initialized with authentication');
  return io;
};

/**
 * Handle device connection
 */
const handleDeviceConnection = async (socket) => {
  try {
    // Device must provide deviceId
    const deviceId = socket.handshake.auth.deviceId;
    
    if (!deviceId) {
      logger.error('Device connection missing deviceId');
      socket.disconnect();
      return;
    }

    // Verify device belongs to user
    const device = await Device.findById(deviceId);
    if (!device || device.userId.toString() !== socket.userId) {
      logger.error(`Device ${deviceId} not found or unauthorized`);
      socket.disconnect();
      return;
    }

    socket.deviceId = deviceId;
    socket.join(`device:${deviceId}`);

    // Register in connection manager
    await deviceConnectionManager.registerDevice(
      deviceId,
      'socket',
      socket,
      {
        ipAddress: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent']
      }
    );

    logger.info(`Device ${deviceId} connected via WebSocket`);

  } catch (error) {
    logger.error(`Error handling device connection: ${error.message}`);
    socket.disconnect();
  }
};

/**
 * Handle dashboard connection
 */
const handleDashboardConnection = async (socket) => {
  try {
    // Join role-based room
    socket.join(socket.userRole); // 'admin' or 'user'
    logger.info(`👤 Dashboard ${socket.id} joined role room: '${socket.userRole}'`);

    // Join rooms for all user's devices
    const devices = await Device.findByUser(socket.userId);
    devices.forEach(device => {
      socket.join(`device:${device._id}`);
    });

    logger.info(`📱 Dashboard ${socket.id} joined ${devices.length} device rooms`);
    logger.info(`🎯 Total rooms for socket ${socket.id}: ${Array.from(socket.rooms).join(', ')}`);

  } catch (error) {
    logger.error(`Error handling dashboard connection: ${error.message}`);
  }
};

/**
 * Set up event handlers for socket
 */
const setupSocketHandlers = (socket) => {
  // Dashboard events
  socket.on(SOCKET_EVENTS.SUBSCRIBE_DEVICE, async (data) => {
    try {
      const { deviceId } = validateMessage('dashboard', 'subscribe_device', data);
      
      // Verify access
      const device = await Device.findById(deviceId);
      if (device) {
        const access = device.hasAccess(socket.userId);
        if (access.hasAccess) {
          socket.join(`device:${deviceId}`);
          logger.info(`Socket ${socket.id} subscribed to device ${deviceId}`);
          socket.emit('subscribed', { deviceId });
        } else {
          socket.emit('error', { message: 'Access denied to device' });
        }
      }
    } catch (error) {
      logger.error(`Subscribe device error: ${error.message}`);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on(SOCKET_EVENTS.UNSUBSCRIBE_DEVICE, async (data) => {
    try {
      const { deviceId } = validateMessage('dashboard', 'unsubscribe_device', data);
      socket.leave(`device:${deviceId}`);
      logger.info(`Socket ${socket.id} unsubscribed from device ${deviceId}`);
      socket.emit('unsubscribed', { deviceId });
    } catch (error) {
      logger.error(`Unsubscribe device error: ${error.message}`);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on(SOCKET_EVENTS.SEND_COMMAND, async (data) => {
    try {
      const validated = validateMessage('dashboard', 'send_command', data);
      const { deviceId, command, payload } = validated;
      
      // Verify control permission
      const device = await Device.findById(deviceId);
      if (!device) {
        socket.emit('error', { message: 'Device not found' });
        return;
      }

      const access = device.hasAccess(socket.userId);
      if (!access.hasAccess || !access.permissions.includes('control')) {
        socket.emit('error', { message: 'No control permission for device' });
        return;
      }

      // Send command via connection manager
      const result = await deviceConnectionManager.sendCommand(
        deviceId,
        command,
        payload,
        socket.userId
      );

      socket.emit('command_sent', result);
      logger.info(`Command ${command} sent to device ${deviceId} by user ${socket.userId}`);

    } catch (error) {
      logger.error(`Send command error: ${error.message}`);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on(SOCKET_EVENTS.REQUEST_DEVICE_STATUS, async (data) => {
    try {
      const { deviceId } = data;
      const status = deviceConnectionManager.getDeviceStatus(deviceId);
      socket.emit('device_status_response', status || { deviceId, status: 'offline' });
    } catch (error) {
      logger.error(`Request device status error: ${error.message}`);
      socket.emit('error', { message: error.message });
    }
  });

  // Visitor approval/rejection events
  socket.on(SOCKET_EVENTS.VISITOR_APPROVAL, async (data) => {
    try {
      const { visitorId, approved, note, timestamp } = data;
      const { VisitorLog } = require('../models');
      
      logger.info(`✅ Visitor ${visitorId} approved by user ${socket.userId}`);
      
      // Update visitor log
      const visitor = await VisitorLog.findById(visitorId);
      if (visitor) {
        visitor.status = 'approved';
        visitor.note = note;
        visitor.processedAt = timestamp;
        visitor.processedBy = socket.userId;
        await visitor.save();

        // Send ACCESS_GRANTED to camera device
        const deviceRoom = `device:${visitor.deviceId}`;
        io.to(deviceRoom).emit(SOCKET_EVENTS.ACCESS_GRANTED, {
          visitorId,
          approved: true,
          note,
          timestamp,
        });

        logger.info(`📤 Access granted message sent to device ${visitor.deviceId}`);

        // Notify all admins about the processed visitor
        emitToRoom('admin', SOCKET_EVENTS.VISITOR_PROCESSED, {
          visitorId,
          status: 'approved',
          deviceName: visitor.deviceName,
          deviceId: visitor.deviceId,
          processedBy: socket.userId,
          timestamp,
        });
      }
    } catch (error) {
      logger.error(`Visitor approval error: ${error.message}`);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on(SOCKET_EVENTS.VISITOR_REJECTION, async (data) => {
    try {
      const { visitorId, approved, reason, timestamp } = data;
      const { VisitorLog } = require('../models');
      
      logger.info(`❌ Visitor ${visitorId} rejected by user ${socket.userId}`);
      
      // Update visitor log
      const visitor = await VisitorLog.findById(visitorId);
      if (visitor) {
        visitor.status = 'rejected';
        visitor.note = reason;
        visitor.processedAt = timestamp;
        visitor.processedBy = socket.userId;
        await visitor.save();

        // Send ACCESS_DENIED to camera device
        const deviceRoom = `device:${visitor.deviceId}`;
        io.to(deviceRoom).emit(SOCKET_EVENTS.ACCESS_DENIED, {
          visitorId,
          approved: false,
          reason,
          timestamp,
        });

        logger.info(`📤 Access denied message sent to device ${visitor.deviceId}`);

        // Notify all admins about the processed visitor
        emitToRoom('admin', SOCKET_EVENTS.VISITOR_PROCESSED, {
          visitorId,
          status: 'rejected',
          deviceName: visitor.deviceName,
          deviceId: visitor.deviceId,
          processedBy: socket.userId,
          timestamp,
        });
      }
    } catch (error) {
      logger.error(`Visitor rejection error: ${error.message}`);
      socket.emit('error', { message: error.message });
    }
  });

  // Device events
  socket.on(SOCKET_EVENTS.DEVICE_HEARTBEAT, async (data) => {
    try {
      const validated = validateMessage('device', 'device_heartbeat', data);
      await deviceConnectionManager.updateHeartbeat(socket.deviceId, validated);
    } catch (error) {
      logger.error(`Device heartbeat error: ${error.message}`);
    }
  });

  socket.on(SOCKET_EVENTS.COMMAND_ACK, async (data) => {
    try {
      const validated = validateMessage('device', 'command_ack', data);
      const { commandId, status, errorMessage } = validated;
      await deviceConnectionManager.handleCommandAck(commandId, status, errorMessage);
    } catch (error) {
      logger.error(`Command ack error: ${error.message}`);
    }
  });

  // Additional device event handlers can be added here
  socket.on(SOCKET_EVENTS.SNAPSHOT_READY, async (data) => {
    try {
      const validated = validateMessage('device', 'snapshot_ready', data);
      // Handle snapshot (this would integrate with visitor log creation)
      logger.info(`Snapshot ready from device ${socket.deviceId}`);
      
      // Broadcast to device owner
      const device = await Device.findById(socket.deviceId);
      if (device) {
        io.to(`user:${device.userId}`).emit(SOCKET_EVENTS.SNAPSHOT_READY, validated);
      }
    } catch (error) {
      logger.error(`Snapshot ready error: ${error.message}`);
    }
  });
};

/**
 * Handle socket disconnection
 */
const handleDisconnection = async (socket, reason) => {
  try {
    logger.info(`Client disconnected: ${socket.id} - Reason: ${reason}`);

    // If device, unregister from connection manager
    if (socket.deviceId) {
      await deviceConnectionManager.unregisterDevice(socket.deviceId, 'socket', reason);
    }

    // Clean up rooms
    socket.rooms.forEach(room => {
      socket.leave(room);
    });

  } catch (error) {
    logger.error(`Error handling disconnection: ${error.message}`);
  }
};

/**
 * Get Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocketIO() first.');
  }
  return io;
};

/**
 * Emit event to specific room
 */
const emitToRoom = (room, event, data) => {
  if (io) {
    const socketsInRoom = io.sockets.adapter.rooms.get(room);
    const clientCount = socketsInRoom ? socketsInRoom.size : 0;
    
    logger.info(`📡 Emitting '${event}' to room '${room}' (${clientCount} clients)`);
    
    if (clientCount === 0) {
      logger.warn(`⚠️  No clients in room '${room}' - event will not be received`);
    }
    
    io.to(room).emit(event, data);
    logger.debug(`✅ Emitted ${event} to room ${room}`);
  } else {
    logger.error(`❌ Cannot emit to room '${room}' - Socket.IO not initialized`);
  }
};

/**
 * Emit event to all connected clients
 */
const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
    logger.debug(`Emitted ${event} to all clients`);
  }
};

module.exports = {
  initSocketIO,
  getIO,
  emitToRoom,
  emitToAll,
  SOCKET_EVENTS
};
