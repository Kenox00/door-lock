const Joi = require('joi');

/**
 * Message Validation Schemas
 * Validates all device and dashboard events
 */

// Device → Backend Events
const deviceEventSchemas = {
  device_register: Joi.object({
    espId: Joi.string().required().trim().uppercase(),
    deviceType: Joi.string().valid('esp32-cam', 'door-lock', 'motion-sensor').required(),
    firmwareVersion: Joi.string().required(),
    metadata: Joi.object({
      macAddress: Joi.string(),
      chipModel: Joi.string(),
      flashSize: Joi.string(),
      freeHeap: Joi.number().min(0)
    })
  }),

  device_heartbeat: Joi.object({
    deviceId: Joi.string().required(),
    batteryLevel: Joi.number().min(0).max(100),
    status: Joi.string().valid('online', 'offline', 'maintenance'),
    metadata: Joi.object()
  }),

  door_status_changed: Joi.object({
    deviceId: Joi.string().required(),
    status: Joi.string().valid('locked', 'unlocked', 'error').required(),
    timestamp: Joi.date().iso().required(),
    triggeredBy: Joi.string().valid('manual', 'remote', 'auto'),
    batteryLevel: Joi.number().min(0).max(100)
  }),

  snapshot_ready: Joi.object({
    deviceId: Joi.string().required(),
    imageUrl: Joi.string().uri().required(),
    timestamp: Joi.date().iso().required(),
    triggeredBy: Joi.string().valid('motion', 'manual', 'scheduled').required(),
    metadata: Joi.object()
  }),

  motion_detected: Joi.object({
    deviceId: Joi.string().required(),
    timestamp: Joi.date().iso().required(),
    confidence: Joi.number().min(0).max(100),
    metadata: Joi.object()
  }),

  low_battery: Joi.object({
    deviceId: Joi.string().required(),
    batteryLevel: Joi.number().min(0).max(100).required(),
    timestamp: Joi.date().iso().required()
  }),

  error_occurred: Joi.object({
    deviceId: Joi.string().required(),
    errorCode: Joi.string().required(),
    errorMessage: Joi.string().required(),
    timestamp: Joi.date().iso().required(),
    metadata: Joi.object()
  }),

  command_ack: Joi.object({
    commandId: Joi.string().required(),
    deviceId: Joi.string().required(),
    status: Joi.string().valid('received', 'executing', 'executed', 'failed').required(),
    timestamp: Joi.date().iso().required(),
    errorMessage: Joi.string()
  })
};

// Dashboard → Backend Events
const dashboardEventSchemas = {
  authenticate: Joi.object({
    token: Joi.string().required()
  }),

  subscribe_device: Joi.object({
    deviceId: Joi.string().required()
  }),

  unsubscribe_device: Joi.object({
    deviceId: Joi.string().required()
  }),

  send_command: Joi.object({
    deviceId: Joi.string().required(),
    command: Joi.string().valid(
      'lock_door',
      'unlock_door',
      'request_snapshot',
      'update_settings',
      'restart_device',
      'firmware_update'
    ).required(),
    payload: Joi.object()
  })
};

// Backend → Device Commands
const deviceCommandSchemas = {
  lock_door: Joi.object({
    commandId: Joi.string().required(),
    timestamp: Joi.date().iso().required()
  }),

  unlock_door: Joi.object({
    commandId: Joi.string().required(),
    duration: Joi.number().min(1000).max(30000).default(5000), // Auto-lock timeout in ms
    timestamp: Joi.date().iso().required()
  }),

  request_snapshot: Joi.object({
    commandId: Joi.string().required(),
    quality: Joi.string().valid('low', 'medium', 'high').default('high'),
    timestamp: Joi.date().iso().required()
  }),

  update_settings: Joi.object({
    commandId: Joi.string().required(),
    settings: Joi.object({
      autoLockTimeout: Joi.number().min(0).max(3600000),
      motionSensitivity: Joi.number().min(0).max(100),
      captureMode: Joi.string().valid('on_motion', 'continuous', 'manual')
    }).required(),
    timestamp: Joi.date().iso().required()
  }),

  restart_device: Joi.object({
    commandId: Joi.string().required(),
    timestamp: Joi.date().iso().required()
  }),

  firmware_update: Joi.object({
    commandId: Joi.string().required(),
    version: Joi.string().required(),
    url: Joi.string().uri().required(),
    checksum: Joi.string(),
    timestamp: Joi.date().iso().required()
  })
};

/**
 * Validate message against schema
 * @param {String} category - 'device', 'dashboard', or 'command'
 * @param {String} messageType - Event/command type
 * @param {Object} data - Message data
 * @returns {Object} Validated data
 * @throws {Error} Validation error
 */
const validateMessage = (category, messageType, data) => {
  let schemas;
  
  switch (category) {
    case 'device':
      schemas = deviceEventSchemas;
      break;
    case 'dashboard':
      schemas = dashboardEventSchemas;
      break;
    case 'command':
      schemas = deviceCommandSchemas;
      break;
    default:
      throw new Error(`Unknown message category: ${category}`);
  }

  const schema = schemas[messageType];
  
  if (!schema) {
    throw new Error(`Unknown message type '${messageType}' in category '${category}'`);
  }

  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessages = error.details.map(d => d.message).join(', ');
    throw new Error(`Validation error: ${errorMessages}`);
  }

  return value;
};

module.exports = {
  validateMessage,
  deviceEventSchemas,
  dashboardEventSchemas,
  deviceCommandSchemas
};
