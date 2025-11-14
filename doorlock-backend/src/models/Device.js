const mongoose = require('mongoose');

/**
 * Device Schema
 * Represents ESP32 devices connected to the system
 */
const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Device name is required'],
    trim: true,
    maxlength: [50, 'Device name cannot exceed 50 characters']
  },
  espId: {
    type: String,
    required: [true, 'ESP ID is required'],
    unique: true,
    trim: true,
    uppercase: true
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
    freeHeap: Number
  },
  settings: {
    autoLockTimeout: {
      type: Number,
      default: 5000, // milliseconds
      min: 1000,
      max: 60000
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

// Indexes for performance
deviceSchema.index({ espId: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ lastSeen: -1 });

// Enable virtuals in JSON
deviceSchema.set('toJSON', { virtuals: true });
deviceSchema.set('toObject', { virtuals: true });

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
