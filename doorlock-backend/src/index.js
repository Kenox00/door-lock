require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');

// Import configurations
const connectDB = require('./config/database');
const { configureCloudinary } = require('./config/cloudinary');
const { initMQTT } = require('./config/mqtt');
const { initSocketIO } = require('./config/socket');

// Import routes and middleware
const routes = require('./routes');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');

// Import services
const { setupMessageHandlers } = require('./services/mqttService');
const logger = require('./utils/logger');

/**
 * Smart IoT Door Lock System - Backend Server
 * Production-ready Express application with MongoDB, MQTT, and Socket.IO
 */

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Environment variables
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Middleware Configuration
 */

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development; configure properly in production
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: NODE_ENV === 'development' ? true : allowedOrigins, // Allow all in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', apiLimiter);

// Request logging middleware (development)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
    next();
  });
}

/**
 * API Routes
 */
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart IoT Door Lock System API',
    version: '1.0.0',
    documentation: '/api/health',
    timestamp: new Date().toISOString()
  });
});

/**
 * Error Handling
 */
app.use(notFound); // 404 handler
app.use(errorHandler); // Global error handler

/**
 * Initialize Services and Start Server
 */
const startServer = async () => {
  try {
    logger.info('🚀 Starting Door Lock Backend Server...');

    // 1. Connect to MongoDB
    await connectDB();

    // 2. Configure Cloudinary
    configureCloudinary();

    // 3. Initialize MQTT
    await initMQTT();
    logger.info('✅ MQTT Client initialized');

    // Setup MQTT message handlers
    setupMessageHandlers(
      // On device response
      async (payload) => {
        logger.info(`Device response received: ${JSON.stringify(payload)}`);
      },
      // On device status update
      async (payload) => {
        logger.info(`Device status update: ${JSON.stringify(payload)}`);
      }
    );

    // 4. Initialize Socket.IO
    initSocketIO(server);
    logger.info('✅ Socket.IO initialized');

    // 5. Start HTTP server
    server.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`📡 API available at http://localhost:${PORT}/api`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });

  } catch (error) {
    logger.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Graceful Shutdown
 */
const gracefulShutdown = async (signal) => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connection
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      
      // Close MQTT connection
      const { getMQTTClient } = require('./config/mqtt');
      const mqttClient = getMQTTClient();
      if (mqttClient) {
        mqttClient.end();
        logger.info('MQTT connection closed');
      }
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error(`Error during shutdown: ${error.message}`);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Start the server
startServer();

module.exports = { app, server };
