const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./authRoutes');
const doorRoutes = require('./doorRoutes');
const commandRoutes = require('./commandRoutes');
const deviceRoutes = require('./deviceRoutes');

/**
 * Central Route Index
 * Combines all route modules
 */

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Door Lock API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/door', doorRoutes);
router.use('/command', commandRoutes);
router.use('/device', deviceRoutes);

module.exports = router;
