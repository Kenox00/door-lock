const mongoose = require('mongoose');

/**
 * DeviceEvent Schema
 * Audit trail for all device activities
 */
const deviceEventSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: [
      'device_connected',
      'device_disconnected',
      'command_sent',
      'command_received',
      'command_executed',
      'command_failed',
      'status_changed',
      'snapshot_captured',
      'motion_detected',
      'low_battery',
      'error_occurred',
      'settings_updated',
      'firmware_updated'
    ],
    required: true,
    index: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Optional - some events are system-generated
  },
  commandId: {
    type: String,
    // For tracking command lifecycle
  },
  correlationId: {
    type: String,
    index: true,
    // For tracing related events
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    socketId: String,
    source: {
      type: String,
      enum: ['websocket', 'mqtt', 'http', 'system'],
      default: 'system'
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
// Note: deviceId, userId, correlationId, and eventType already have index: true in schema
deviceEventSchema.index({ deviceId: 1, timestamp: -1 });
deviceEventSchema.index({ eventType: 1, timestamp: -1 });
deviceEventSchema.index({ deviceId: 1, eventType: 1, timestamp: -1 });
deviceEventSchema.index({ userId: 1, timestamp: -1 });

// TTL index - automatically delete events older than 90 days
deviceEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

/**
 * Static method to log event
 */
deviceEventSchema.statics.logEvent = async function(eventData) {
  try {
    const event = new this(eventData);
    await event.save();
    return event;
  } catch (error) {
    console.error('Failed to log device event:', error.message);
    // Don't throw - event logging shouldn't break the main flow
  }
};

const DeviceEvent = mongoose.model('DeviceEvent', deviceEventSchema);

module.exports = DeviceEvent;
