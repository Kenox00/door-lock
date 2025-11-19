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
    const deviceId = socket.handshake.auth.deviceId;
    const clientType = socket.handshake.auth.clientType || 'dashboard';
    
    if (!token) {
      logger.warn(`Socket connection rejected: No token provided (${socket.id})`);
      logger.warn(`Handshake details (truncated): ${JSON.stringify({ clientType, deviceId }, null, 2)}`);
      return next(new Error('Authentication required'));
    }

    // Check if this is a device connection (with deviceId and deviceToken)
    if (clientType === 'device' && deviceId) {
      try {
        // Find device and validate token
        const device = await Device.findById(deviceId).select('+deviceToken');
        
        if (!device) {
          logger.warn(`Socket connection rejected: Device not found (${socket.id})`);
          return next(new Error('Device not found'));
        }

        if (device.deviceToken !== token) {
          logger.warn(`Socket connection rejected: Invalid device token (${socket.id}) for device ${deviceId}`);
          return next(new Error('Invalid device token'));
        }

        if (!device.activated) {
          logger.warn(`Socket connection rejected: Device not activated (${socket.id})`);
          return next(new Error('Device not activated'));
        }

        // Attach device info to socket
        socket.deviceId = device._id.toString();
        socket.userId = device.userId.toString();
        socket.userRole = 'device';
        socket.username = device.name;
        socket.clientType = 'device';
        
        // Mark device as online
        device.online = true;
        device.status = 'online';
        device.lastSeen = new Date();
        await device.save();

        logger.info(`Device authenticated via WebSocket: ${socket.id} - Device: ${device.name} (user ${socket.userId})`);
        next();
        return;

      } catch (error) {
        logger.error(`Device authentication error: ${error.message}`);
        return next(new Error('Device authentication failed'));
      }
    }

    // Regular user/dashboard authentication with JWT
    try {
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
      socket.clientType = clientType;
      
      logger.info(`Socket authenticated: ${socket.id} - User: ${user.username}, Role: ${user.role}`);
      next();

    } catch (error) {
      logger.error(`Socket authentication error: ${error.message}`);
      next(new Error('Invalid token'));
    }

  } catch (error) {
    logger.error(`Socket authentication error: ${error.message}`);
    next(new Error('Authentication failed'));
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
    logger.info(`🔌 handleDeviceConnection start for socket ${socket.id}, deviceId=${deviceId}, userId=${socket.userId}`);
    
    if (!deviceId) {
      logger.error('Device connection missing deviceId');
      socket.disconnect();
      return;
    }

    // Verify device belongs to user
    const device = await Device.findById(deviceId);
    
    if (!device) {
      logger.error(`❌ Device ${deviceId} not found in database`);
      socket.disconnect();
      return;
    }
    
    logger.info(`🔍 Device found: ${device.name}`);
    logger.info(`🔍 Device userId: ${device.userId.toString()}`);
    logger.info(`🔍 Socket userId: ${socket.userId}`);
    logger.info(`🔍 Match: ${device.userId.toString() === socket.userId}`);
    
    if (device.userId.toString() !== socket.userId) {
      logger.error(`❌ Device ${deviceId} unauthorized - userId mismatch`);
      logger.error(`   Expected: ${device.userId.toString()}`);
      logger.error(`   Got: ${socket.userId}`);
      socket.disconnect();
      return;
    }
    
    logger.info(`✅ Device ${deviceId} authorization successful`);

    socket.deviceId = deviceId;
    socket.join(`device:${deviceId}`);

    // Mark device as online in database
    device.online = true;
    device.status = 'online';
    device.lastSeen = new Date();
    await device.save();

    logger.info(`🔌 Device ${deviceId} (${device.name}) connected via WebSocket`);
    logger.info(`📊 Device registered with:`);
    logger.info(`   - Device ID: ${deviceId}`);
    logger.info(`   - ESP ID: ${device.espId}`);
    logger.info(`   - Device Type: ${device.deviceType}`);
    logger.info(`   - User ID: ${socket.userId}`);

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
      const visitor = await VisitorLog.findById(visitorId).populate('deviceId');
      if (!visitor) {
        logger.error(`❌ Visitor log ${visitorId} not found`);
        socket.emit('error', { message: 'Visitor log not found' });
        return;
      }

      if (!visitor.deviceId) {
        logger.error(`❌ Visitor log ${visitorId} has no deviceId`);
        socket.emit('error', { message: 'Device ID missing from visitor log' });
        return;
      }

      visitor.status = 'approved';
      visitor.note = note;
      visitor.processedAt = timestamp;
      visitor.processedBy = socket.userId;
      await visitor.save();

      logger.info(`📝 Visitor log ${visitorId} updated to 'approved' status`);

      // **CRITICAL FIX: Send MQTT unlock command to door lock device**
      try {
        const deviceIdStr = visitor.deviceId._id.toString();
        logger.info(`🔓 Attempting to send unlock command to device ${deviceIdStr} (${visitor.deviceId.name})`);
        
        const commandResult = await deviceConnectionManager.sendCommand(
          deviceIdStr,
          'unlock_door',
          { duration: 5000 },
          socket.userId
        );
        
        logger.info(`✅ MQTT unlock command sent successfully: ${JSON.stringify(commandResult)}`);
        logger.info(`📡 Command ID: ${commandResult.commandId}, Status: ${commandResult.status}`);
      } catch (mqttError) {
        logger.error(`❌ Failed to send MQTT unlock command: ${mqttError.message}`);
        logger.error(`Stack trace: ${mqttError.stack}`);
        // Continue execution - visitor is still approved, notify user of command failure
      }

      // Send ACCESS_GRANTED to camera device
      const deviceRoom = `device:${visitor.deviceId._id}`;
      const grantedPayload = {
        visitorId,
        _id: visitorId,  // Include both for compatibility
        approved: true,
        note,
        timestamp,
        deviceId: visitor.deviceId._id,
        deviceName: visitor.deviceName
      };
      
      logger.info(`📤 Emitting ACCESS_GRANTED to room '${deviceRoom}'`);
      logger.info(`📤 Payload: ${JSON.stringify(grantedPayload)}`);
      
      const socketsInRoom = io.sockets.adapter.rooms.get(deviceRoom);
      logger.info(`📊 Sockets in room '${deviceRoom}': ${socketsInRoom ? socketsInRoom.size : 0}`);
      
      io.to(deviceRoom).emit(SOCKET_EVENTS.ACCESS_GRANTED, grantedPayload);

      logger.info(`✅ Access granted message sent to device ${visitor.deviceId._id}`);

      // Notify all admins about the processed visitor
      emitToRoom('admin', SOCKET_EVENTS.VISITOR_PROCESSED, {
        visitorId,
        status: 'approved',
        deviceName: visitor.deviceName,
        deviceId: visitor.deviceId._id,
        processedBy: socket.userId,
        timestamp,
      });
    } catch (error) {
      logger.error(`Visitor approval error: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
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
        const deniedPayload = {
          visitorId,
          _id: visitorId,  // Include both for compatibility
          approved: false,
          reason,
          timestamp,
          deviceId: visitor.deviceId,
          deviceName: visitor.deviceName
        };
        
        logger.info(`📤 Emitting ACCESS_DENIED to room '${deviceRoom}'`);
        logger.info(`📤 Payload: ${JSON.stringify(deniedPayload)}`);
        
        const socketsInRoom = io.sockets.adapter.rooms.get(deviceRoom);
        logger.info(`📊 Sockets in room '${deviceRoom}': ${socketsInRoom ? socketsInRoom.size : 0}`);
        
        io.to(deviceRoom).emit(SOCKET_EVENTS.ACCESS_DENIED, deniedPayload);

        logger.info(`✅ Access denied message sent to device ${visitor.deviceId}`);

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

  // Handle bell-pressed event from camera devices
  socket.on('bell-pressed', async (data) => {
    try {
      const { deviceId, timestamp, pressedBy, metadata } = data;
      logger.info(`🔔 Bell pressed on device ${deviceId} by ${pressedBy}`);
      
      // Get device info
      const device = await Device.findById(deviceId);
      if (!device) {
        logger.error(`Bell press: Device ${deviceId} not found`);
        return;
      }
      
      // Create a visitor log entry for the bell press
      // This will be updated with a photo when the upload happens
      const { VisitorLog } = require('../models');
      const visitorLog = new VisitorLog({
        deviceId: device._id,
        deviceName: device.name,
        status: 'pending',
        bellPressed: true,
        pressedBy,
        pressedAt: new Date(timestamp),
        metadata: {
          source: 'bell-press',
          ...metadata
        }
      });
      
      await visitorLog.save();
      logger.info(`📝 Visitor log created for bell press: ${visitorLog._id}`);
      
      // Notify all admins about the new visitor
      emitToRoom('admin', SOCKET_EVENTS.NEW_VISITOR, {
        visitorId: visitorLog._id,
        deviceId: device._id,
        deviceName: device.name,
        timestamp: visitorLog.timestamp,
        status: 'pending',
        bellPressed: true,
        message: `Bell pressed at ${device.name}`
      });
      
      logger.info(`📡 Bell press notification sent to admins for device ${device.name}`);
      
    } catch (error) {
      logger.error(`Bell press handler error: ${error.message}`);
    }
  });
};

/**
 * Handle socket disconnection
 */
const handleDisconnection = async (socket, reason) => {
  try {
    logger.info(`Client disconnected: ${socket.id} - Reason: ${reason}`);

    // If device, unregister from connection manager and mark offline
    if (socket.deviceId) {
      await deviceConnectionManager.unregisterDevice(socket.deviceId, 'socket', reason);
      
      // Mark device as offline
      const device = await Device.findById(socket.deviceId);
      if (device) {
        device.online = false;
        device.status = 'offline';
        device.lastSeen = new Date();
        await device.save();

        // Notify clients about device going offline
        io.emit(SOCKET_EVENTS.DEVICE_STATUS, {
          deviceId: device._id,
          deviceName: device.name,
          status: 'offline',
          online: false,
          lastSeen: device.lastSeen
        });
      }
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
