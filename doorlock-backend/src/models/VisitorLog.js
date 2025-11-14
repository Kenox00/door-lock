const mongoose = require('mongoose');

/**
 * VisitorLog Schema
 * Records all visitor attempts with photos and admin decisions
 */
const visitorLogSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  imagePublicId: {
    type: String, // Cloudinary public ID for deletion
  },
  status: {
    type: String,
    enum: ['pending', 'granted', 'denied'],
    default: 'pending'
  },
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: [true, 'Device ID is required']
  },
  deviceName: {
    type: String
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminUsername: {
    type: String
  },
  decisionTime: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: {
      latitude: Number,
      longitude: Number
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

/**
 * Update decision timestamp when status changes
 */
visitorLogSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status !== 'pending') {
    this.decisionTime = new Date();
  }
  next();
});

/**
 * Virtual for response time (decision time - timestamp)
 */
visitorLogSchema.virtual('responseTime').get(function() {
  if (this.decisionTime && this.timestamp) {
    return Math.floor((this.decisionTime - this.timestamp) / 1000); // in seconds
  }
  return null;
});

// Indexes for efficient querying
visitorLogSchema.index({ deviceId: 1, timestamp: -1 });
visitorLogSchema.index({ status: 1, timestamp: -1 });
visitorLogSchema.index({ timestamp: -1 });
visitorLogSchema.index({ adminId: 1 });

// Enable virtuals in JSON
visitorLogSchema.set('toJSON', { virtuals: true });
visitorLogSchema.set('toObject', { virtuals: true });

const VisitorLog = mongoose.model('VisitorLog', visitorLogSchema);

module.exports = VisitorLog;
