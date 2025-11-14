const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { getMQTTClient } = require('../config/mqtt');
const { getIO } = require('../config/socket');
const { Device } = require('../models');
const deviceConnectionManager = require('../services/deviceConnectionManager');
const mongoose = require('mongoose');

/**
 * Basic health check (public)
 * GET /api/health
 */
router.get('/', (req, res) => {
  return successResponse(res, {
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  }, 'Service is running');
});

/**
 * Detailed health check (authenticated)
 * GET /api/health/detailed
 */
router.get('/detailed', authenticate, async (req, res) => {
  try {
    const health = {
      timestamp: new Date(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {},
      devices: {},
      connections: {},
      memory: process.memoryUsage()
    };

    // Check MongoDB
    try {
      const mongoState = mongoose.connection.readyState;
      health.services.mongodb = {
        status: mongoState === 1 ? 'ok' : 'error',
        state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoState],
        host: mongoose.connection.host,
        database: mongoose.connection.name
      };
    } catch (error) {
      health.services.mongodb = { status: 'error', message: error.message };
    }

    // Check MQTT
    try {
      const mqttClient = getMQTTClient();
      health.services.mqtt = {
        status: mqttClient.connected ? 'ok' : 'error',
        connected: mqttClient.connected,
        reconnecting: mqttClient.reconnecting
      };
    } catch (error) {
      health.services.mqtt = { status: 'error', message: error.message };
    }

    // Check Socket.IO
    try {
      const io = getIO();
      const sockets = await io.fetchSockets();
      health.services.socketio = {
        status: 'ok',
        clientsCount: sockets.length
      };
    } catch (error) {
      health.services.socketio = { status: 'error', message: error.message };
    }

    // Device statistics
    try {
      const [total, online, offline, maintenance] = await Promise.all([
        Device.countDocuments(),
        Device.countDocuments({ status: 'online' }),
        Device.countDocuments({ status: 'offline' }),
        Device.countDocuments({ status: 'maintenance' })
      ]);

      health.devices = {
        total,
        online,
        offline,
        maintenance,
        onlinePercentage: total > 0 ? ((online / total) * 100).toFixed(2) + '%' : '0%'
      };
    } catch (error) {
      health.devices = { status: 'error', message: error.message };
    }

    // Connection manager statistics
    try {
      const connectedDevices = deviceConnectionManager.getAllConnectedDevices();
      health.connections = {
        totalConnected: connectedDevices.length,
        websocketConnections: connectedDevices.filter(d => d.hasSocket).length,
        mqttConnections: connectedDevices.filter(d => d.hasMqtt).length,
        dualConnections: connectedDevices.filter(d => d.hasSocket && d.hasMqtt).length
      };
    } catch (error) {
      health.connections = { status: 'error', message: error.message };
    }

    // Overall health status
    const allServicesOk = Object.values(health.services).every(
      service => service.status === 'ok'
    );
    health.overall = allServicesOk ? 'healthy' : 'degraded';

    const statusCode = allServicesOk ? 200 : 503;
    return res.status(statusCode).json({
      success: allServicesOk,
      data: health
    });

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/**
 * Get device connection details
 * GET /api/health/devices
 */
router.get('/devices', authenticate, async (req, res) => {
  try {
    const connectedDevices = deviceConnectionManager.getAllConnectedDevices();
    
    const deviceDetails = await Promise.all(
      connectedDevices.map(async (conn) => {
        const device = await Device.findById(conn.deviceId).select('name espId userId location');
        return {
          deviceId: conn.deviceId,
          name: device?.name,
          espId: device?.espId,
          status: conn.status,
          hasWebSocket: conn.hasSocket,
          hasMQTT: conn.hasMqtt,
          connectedAt: conn.connectedAt,
          lastSeen: conn.lastSeen,
          uptimeMinutes: Math.floor((Date.now() - new Date(conn.connectedAt).getTime()) / 60000)
        };
      })
    );

    return successResponse(res, {
      totalDevices: deviceDetails.length,
      devices: deviceDetails
    }, 'Device connection details retrieved');

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/**
 * Get system metrics
 * GET /api/health/metrics
 */
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const DeviceEvent = require('../models/DeviceEvent');
    const { VisitorLog } = require('../models');
    
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      eventsLast24h,
      eventsLastHour,
      visitorsLast24h,
      commandsLast24h,
      errorsLast24h
    ] = await Promise.all([
      DeviceEvent.countDocuments({ timestamp: { $gte: last24Hours } }),
      DeviceEvent.countDocuments({ timestamp: { $gte: lastHour } }),
      VisitorLog.countDocuments({ timestamp: { $gte: last24Hours } }),
      DeviceEvent.countDocuments({ 
        eventType: { $in: ['command_sent', 'command_executed'] },
        timestamp: { $gte: last24Hours }
      }),
      DeviceEvent.countDocuments({ 
        eventType: { $in: ['command_failed', 'error_occurred'] },
        timestamp: { $gte: last24Hours }
      })
    ]);

    return successResponse(res, {
      period: {
        last24Hours: {
          events: eventsLast24h,
          visitors: visitorsLast24h,
          commands: commandsLast24h,
          errors: errorsLast24h,
          errorRate: commandsLast24h > 0 ? ((errorsLast24h / commandsLast24h) * 100).toFixed(2) + '%' : '0%'
        },
        lastHour: {
          events: eventsLastHour,
          eventsPerMinute: (eventsLastHour / 60).toFixed(2)
        }
      },
      timestamp: now
    }, 'System metrics retrieved');

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
