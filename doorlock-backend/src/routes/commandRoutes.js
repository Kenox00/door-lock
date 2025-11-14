const express = require('express');
const router = express.Router();
const commandController = require('../controllers/commandController');
const { authenticate } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Command Routes
 * Base path: /api/command
 */

/**
 * @route   POST /api/command/open
 * @desc    Send OPEN command to ESP32 (grant access)
 * @access  Private (Admin only)
 */
router.post('/open', authenticate, asyncHandler(commandController.openDoor));

/**
 * @route   POST /api/command/deny
 * @desc    Send DENY command to ESP32 (deny access)
 * @access  Private (Admin only)
 */
router.post('/deny', authenticate, asyncHandler(commandController.denyDoor));

/**
 * @route   GET /api/command/history
 * @desc    Get command history (all admin decisions)
 * @access  Private
 */
router.get('/history', authenticate, asyncHandler(commandController.getCommandHistory));

module.exports = router;
