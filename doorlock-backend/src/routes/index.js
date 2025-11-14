const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./authRoutes');
const doorRoutes = require('./doorRoutes');
const commandRoutes = require('./commandRoutes');
const deviceRoutes = require('./deviceRoutes');
const healthRoutes = require('./healthRoutes');

/**
 * Central Route Index
 * Combines all route modules
 */

// API routes
router.use('/auth', authRoutes);
router.use('/door', doorRoutes);
router.use('/command', commandRoutes);
router.use('/device', deviceRoutes);
router.use('/health', healthRoutes);

module.exports = router;
