const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticate, authorize } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Device Routes
 * Base path: /api/device
 */

/**
 * @route   POST /api/device/register
 * @desc    Register new ESP32 device
 * @access  Private (Admin only)
 */
router.post('/register', authenticate, asyncHandler(deviceController.registerDevice));

/**
 * @route   GET /api/device
 * @desc    Get all devices
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(deviceController.getAllDevices));

/**
 * @route   GET /api/device/stats
 * @desc    Get device statistics
 * @access  Private
 */
router.get('/stats', authenticate, asyncHandler(deviceController.getDeviceStats));

/**
 * @route   GET /api/device/:id
 * @desc    Get device by ID
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(deviceController.getDeviceById));

/**
 * @route   PUT /api/device/:id
 * @desc    Update device
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, asyncHandler(deviceController.updateDevice));

/**
 * @route   GET /api/device/:id/qr
 * @desc    Get device QR code for onboarding
 * @access  Private
 */
router.get('/:id/qr', authenticate, asyncHandler(deviceController.getDeviceQR));

/**
 * @route   POST /api/device/activate
 * @desc    Activate device using QR code token
 * @access  Public (uses device token for auth)
 */
router.post('/activate', asyncHandler(deviceController.activateDevice));

/**
 * @route   POST /api/device/:id/heartbeat
 * @desc    Device heartbeat (update last seen)
 * @access  Public (can be secured with device token)
 */
router.post('/:id/heartbeat', asyncHandler(deviceController.deviceHeartbeat));

/**
 * @route   DELETE /api/device/:id
 * @desc    Delete device
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, asyncHandler(deviceController.deleteDevice));

module.exports = router;
