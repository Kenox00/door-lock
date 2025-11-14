const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io = null;

/**
 * Socket.IO Events used in the system
 */
const SOCKET_EVENTS = {
  NEW_VISITOR: 'new_visitor',           // Emit when visitor photo uploaded
  DOOR_DECISION: 'door_decision',       // Emit admin decision to DoorApp
  DEVICE_STATUS: 'device_status',       // Emit device online/offline status
  ADMIN_CONNECTED: 'admin_connected',   // Admin app connected
  ADMIN_DISCONNECTED: 'admin_disconnected',
};

/**
 * Initialize Socket.IO server
 * @param {Object} httpServer - HTTP server instance
 */
const initSocketIO = (httpServer) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://localhost:3001'];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Connection handling
  io.on('connection', (socket) => {
    logger.info(`Socket.IO client connected: ${socket.id}`);

    // Handle client identification
    socket.on('identify', (data) => {
      const { clientType } = data; // 'admin' or 'door'
      socket.join(clientType);
      logger.info(`Client ${socket.id} identified as: ${clientType}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket.IO client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket.IO error: ${error.message}`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
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
    io.to(room).emit(event, data);
    logger.info(`Emitted ${event} to room ${room}`);
  }
};

/**
 * Emit event to all connected clients
 */
const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
    logger.info(`Emitted ${event} to all clients`);
  }
};

module.exports = {
  initSocketIO,
  getIO,
  emitToRoom,
  emitToAll,
  SOCKET_EVENTS
};
