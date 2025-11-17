const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Dashboard Routes
 * Base path: /api/dashboard
 */

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics (devices, visitors, activity)
 * @access  Private
 */
router.get('/stats', authenticate, asyncHandler(dashboardController.getDashboardStats));

/**
 * @route   GET /api/dashboard/activity
 * @desc    Get recent activity for dashboard
 * @access  Private
 */
router.get('/activity', authenticate, asyncHandler(dashboardController.getRecentActivity));

/**
 * @route   GET /api/dashboard/devices-summary
 * @desc    Get devices summary grouped by type
 * @access  Private
 */
router.get('/devices-summary', authenticate, asyncHandler(dashboardController.getDevicesSummary));

/**
 * @route   GET /api/dashboard/alerts
 * @desc    Get alerts and notifications count
 * @access  Private
 */
router.get('/alerts', authenticate, asyncHandler(dashboardController.getAlerts));

module.exports = router;
