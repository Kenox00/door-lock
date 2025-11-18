const mongoose = require('mongoose');

/**
 * Device Schema
 * Represents ESP32 devices connected to the system
 */
const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Device owner is required'],
    index: true
  },
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permissions: [{
      type: String,
      enum: ['view', 'control'],
      default: ['view']
    }],
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  name: {
    type: String,
    required: [true, 'Device name is required'],
    trim: true,
    maxlength: [50, 'Device name cannot exceed 50 characters']
  },
  deviceType: {
    type: String,
    enum: ['esp32-cam', 'door-lock', 'motion-sensor', 'other'],
    default: 'door-lock'
  },
  espId: {
    type: String,
    required: [true, 'ESP ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  deviceToken: {
    type: String,
    // Secure token for device authentication
    select: false // Don't return in queries by default
  },
  room: {
    type: String,
    trim: true,
    maxlength: [100, 'Room name cannot exceed 100 characters']
  },
  activated: {
    type: Boolean,
    default: false
  },
  activatedAt: {
    type: Date
  },
  online: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance'],
    default: 'offline'
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  firmwareVersion: {
    type: String,
    default: '1.0.0'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  },
  metadata: {
    macAddress: String,
    chipModel: String,
    flashSize: String,
    freeHeap: Number,
    batteryLevel: Number,
    rssi: Number // WiFi signal strength
  },
  settings: {
    autoLockTimeout: {
      type: Number,
      default: 5000, // milliseconds
      min: 1000,
      max: 60000
    },
    motionSensitivity: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },
    captureMode: {
      type: String,
      enum: ['on_motion', 'continuous', 'manual'],
      default: 'on_motion'
    },
    enableNotifications: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

/**
 * Method to update last seen timestamp
 */
deviceSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  this.status = 'online';
  return this.save();
};

/**
 * Method to mark device as offline
 */
deviceSchema.methods.markOffline = function() {
  this.status = 'offline';
  return this.save();
};

/**
 * Virtual to check if device is recently active (within last 5 minutes)
 */
deviceSchema.virtual('isRecentlyActive').get(function() {
  if (!this.lastSeen) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastSeen > fiveMinutesAgo;
});

/**
 * Static method to find active devices
 */
deviceSchema.statics.findActiveDevices = function() {
  return this.find({ isActive: true, status: 'online' });
};

/**
 * Static method to find devices by user (owner or shared)
 */
deviceSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [
      { userId: userId },
      { 'sharedWith.userId': userId }
    ],
    isActive: true
  });
};

/**
 * Method to check if user has access to device
 */
deviceSchema.methods.hasAccess = function(userId) {
  // Check if owner
  if (this.userId.toString() === userId.toString()) {
    return { hasAccess: true, permissions: ['view', 'control', 'admin'] };
  }
  
  // Check if shared
  const sharedAccess = this.sharedWith.find(
    share => share.userId.toString() === userId.toString()
  );
  
  if (sharedAccess) {
    return { hasAccess: true, permissions: sharedAccess.permissions };
  }
  
  return { hasAccess: false, permissions: [] };
};

// Indexes for performance
// Note: espId already has unique index, userId already has index: true in schema
deviceSchema.index({ status: 1 });
deviceSchema.index({ lastSeen: -1 });
deviceSchema.index({ 'sharedWith.userId': 1 });

// Enable virtuals in JSON
deviceSchema.set('toJSON', { virtuals: true });
deviceSchema.set('toObject', { virtuals: true });

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
