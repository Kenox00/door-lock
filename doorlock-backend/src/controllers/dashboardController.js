const { Device, DeviceEvent, VisitorLog } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Dashboard Controller
 * Provides aggregated statistics and overview data for the admin dashboard
 */

/**
 * Get dashboard statistics
 * GET /api/dashboard/stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's devices
    const userDevices = await Device.find({
      $or: [
        { userId },
        { 'sharedWith.userId': userId }
      ]
    });

    const deviceIds = userDevices.map(d => d._id);

    // Get device statistics
    const totalDevices = userDevices.length;
    const onlineDevices = userDevices.filter(d => d.status === 'online').length;
    const offlineDevices = userDevices.filter(d => d.status === 'offline').length;
    const activeDevices = userDevices.filter(d => d.isActive).length;

    // Get last activity timestamp
    const lastActivity = await DeviceEvent.findOne({
      deviceId: { $in: deviceIds }
    })
      .sort({ timestamp: -1 })
      .select('timestamp');

    // Get visitor statistics for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [pendingVisitors, todayVisitors, todayGranted, todayDenied] = await Promise.all([
      VisitorLog.countDocuments({
        deviceId: { $in: deviceIds },
        status: 'pending'
      }),
      VisitorLog.countDocuments({
        deviceId: { $in: deviceIds },
        timestamp: { $gte: todayStart }
      }),
      VisitorLog.countDocuments({
        deviceId: { $in: deviceIds },
        status: 'granted',
        timestamp: { $gte: todayStart }
      }),
      VisitorLog.countDocuments({
        deviceId: { $in: deviceIds },
        status: 'denied',
        timestamp: { $gte: todayStart }
      })
    ]);

    // Get device types breakdown
    const deviceTypeBreakdown = {};
    userDevices.forEach(device => {
      const type = device.deviceType || 'unknown';
      deviceTypeBreakdown[type] = (deviceTypeBreakdown[type] || 0) + 1;
    });

    // Get recent events count (last 24 hours)
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const recentEventsCount = await DeviceEvent.countDocuments({
      deviceId: { $in: deviceIds },
      timestamp: { $gte: last24Hours }
    });

    return successResponse(res, {
      devices: {
        total: totalDevices,
        online: onlineDevices,
        offline: offlineDevices,
        active: activeDevices,
        byType: deviceTypeBreakdown
      },
      visitors: {
        pending: pendingVisitors,
        today: todayVisitors,
        todayGranted,
        todayDenied
      },
      activity: {
        lastActivity: lastActivity?.timestamp || null,
        recentEvents: recentEventsCount
      }
    }, 'Dashboard statistics retrieved successfully');

  } catch (error) {
    logger.error(`Get dashboard stats error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get recent activity for dashboard
 * GET /api/dashboard/activity
 */
const getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user.userId;

    // Get user's devices
    const userDevices = await Device.find({
      $or: [
        { userId },
        { 'sharedWith.userId': userId }
      ]
    }).select('_id');

    const deviceIds = userDevices.map(d => d._id);

    // Get recent events and visitor logs
    const [recentEvents, recentVisitors] = await Promise.all([
      DeviceEvent.find({
        deviceId: { $in: deviceIds },
        eventType: { 
          $in: ['command_executed', 'status_changed', 'motion_detected', 'device_connected', 'device_disconnected'] 
        }
      })
        .populate('deviceId', 'name deviceType')
        .populate('userId', 'username')
        .sort({ timestamp: -1 })
        .limit(parseInt(limit) / 2),
      
      VisitorLog.find({
        deviceId: { $in: deviceIds }
      })
        .populate('deviceId', 'name deviceType')
        .populate('adminId', 'username')
        .sort({ timestamp: -1 })
        .limit(parseInt(limit) / 2)
    ]);

    // Combine and format activities
    const activities = [
      ...recentEvents.map(event => ({
        id: event._id,
        type: 'device_event',
        eventType: event.eventType,
        deviceName: event.deviceId?.name || 'Unknown Device',
        deviceType: event.deviceId?.deviceType,
        message: getActivityMessage(event.eventType, event.payload),
        username: event.userId?.username,
        timestamp: event.timestamp,
        icon: getEventIcon(event.eventType)
      })),
      ...recentVisitors.map(visitor => ({
        id: visitor._id,
        type: 'visitor_log',
        eventType: visitor.status,
        deviceName: visitor.deviceId?.name || visitor.deviceName,
        deviceType: 'door-lock',
        message: `Door visitor ${visitor.status}`,
        username: visitor.adminUsername,
        imageUrl: visitor.imageUrl,
        timestamp: visitor.timestamp,
        icon: 'door'
      }))
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    return successResponse(res, activities, 'Recent activity retrieved successfully');

  } catch (error) {
    logger.error(`Get recent activity error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get device summary for dashboard
 * GET /api/dashboard/devices-summary
 */
const getDevicesSummary = async (req, res) => {
  try {
    const userId = req.user.userId;

    const devices = await Device.find({
      $or: [
        { userId },
        { 'sharedWith.userId': userId }
      ]
    }).select('name deviceType status isActive lastSeen location');

    // Group by type
    const summary = devices.reduce((acc, device) => {
      const type = device.deviceType || 'unknown';
      if (!acc[type]) {
        acc[type] = {
          type,
          count: 0,
          online: 0,
          offline: 0,
          devices: []
        };
      }
      
      acc[type].count++;
      if (device.status === 'online') acc[type].online++;
      else acc[type].offline++;
      
      acc[type].devices.push({
        id: device._id,
        name: device.name,
        status: device.status,
        isActive: device.isActive,
        lastSeen: device.lastSeen,
        location: device.location
      });
      
      return acc;
    }, {});

    return successResponse(res, Object.values(summary), 'Devices summary retrieved successfully');

  } catch (error) {
    logger.error(`Get devices summary error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get alerts and notifications count
 * GET /api/dashboard/alerts
 */
const getAlerts = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's devices
    const userDevices = await Device.find({
      $or: [
        { userId },
        { 'sharedWith.userId': userId }
      ]
    }).select('_id');

    const deviceIds = userDevices.map(d => d._id);

    // Get various alert counts
    const [
      pendingVisitors,
      offlineDevices,
      recentErrors,
      lowBattery
    ] = await Promise.all([
      VisitorLog.countDocuments({
        deviceId: { $in: deviceIds },
        status: 'pending'
      }),
      Device.countDocuments({
        _id: { $in: deviceIds },
        status: 'offline'
      }),
      DeviceEvent.countDocuments({
        deviceId: { $in: deviceIds },
        eventType: 'error_occurred',
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      DeviceEvent.countDocuments({
        deviceId: { $in: deviceIds },
        eventType: 'low_battery',
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    const alerts = {
      pendingVisitors,
      offlineDevices,
      recentErrors,
      lowBattery,
      total: pendingVisitors + offlineDevices + recentErrors + lowBattery
    };

    return successResponse(res, alerts, 'Alerts retrieved successfully');

  } catch (error) {
    logger.error(`Get alerts error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Helper: Get activity message
 */
function getActivityMessage(eventType, payload = {}) {
  const messages = {
    'device_connected': 'Device connected',
    'device_disconnected': 'Device disconnected',
    'command_executed': `Command executed: ${payload.command || 'unknown'}`,
    'status_changed': `Status changed to ${payload.status || 'unknown'}`,
    'motion_detected': 'Motion detected',
    'low_battery': `Low battery warning`,
    'error_occurred': `Error occurred`
  };
  return messages[eventType] || eventType;
}

/**
 * Helper: Get event icon type
 */
function getEventIcon(eventType) {
  const icons = {
    'device_connected': 'check',
    'device_disconnected': 'x',
    'command_executed': 'command',
    'status_changed': 'info',
    'motion_detected': 'motion',
    'low_battery': 'battery',
    'error_occurred': 'alert'
  };
  return icons[eventType] || 'info';
}

module.exports = {
  getDashboardStats,
  getRecentActivity,
  getDevicesSummary,
  getAlerts
};
