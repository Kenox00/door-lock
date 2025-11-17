const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');
const { authenticate } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Logs Routes
 * Base path: /api/logs
 */

/**
 * @route   GET /api/logs
 * @desc    Get all logs (device events and visitor logs combined)
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(logsController.getAllLogs));

/**
 * @route   GET /api/logs/activity
 * @desc    Get activity logs (device events only)
 * @access  Private
 */
router.get('/activity', authenticate, asyncHandler(logsController.getActivityLogs));

/**
 * @route   GET /api/logs/visitors
 * @desc    Get visitor logs
 * @access  Private
 */
router.get('/visitors', authenticate, asyncHandler(logsController.getVisitorLogs));

/**
 * @route   GET /api/logs/device/:deviceId
 * @desc    Get logs for a specific device
 * @access  Private
 */
router.get('/device/:deviceId', authenticate, asyncHandler(logsController.getLogsByDevice));

/**
 * @route   GET /api/logs/type/:type
 * @desc    Get logs by event type
 * @access  Private
 */
router.get('/type/:type', authenticate, asyncHandler(logsController.getLogsByType));

/**
 * @route   DELETE /api/logs
 * @desc    Clear old logs
 * @access  Private
 */
router.delete('/', authenticate, asyncHandler(logsController.clearLogs));

module.exports = router;
