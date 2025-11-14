const express = require('express');
const router = express.Router();
const doorController = require('../controllers/doorController');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const { uploadLimiter } = require('../middlewares/rateLimiter');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Door Routes
 * Base path: /api/door
 */

/**
 * @route   POST /api/door/upload
 * @desc    Upload visitor photo from DoorApp
 * @access  Public (can be secured with API key in production)
 */
router.post(
  '/upload',
  uploadLimiter,
  upload.single('image'),
  asyncHandler(doorController.uploadVisitorPhoto)
);

/**
 * @route   GET /api/door/logs
 * @desc    Get all visitor logs with pagination and filters
 * @access  Private
 */
router.get('/logs', authenticate, asyncHandler(doorController.getVisitorLogs));

/**
 * @route   GET /api/door/logs/pending
 * @desc    Get pending visitor logs
 * @access  Private
 */
router.get('/logs/pending', authenticate, asyncHandler(doorController.getPendingLogs));

/**
 * @route   GET /api/door/logs/:id
 * @desc    Get single visitor log by ID
 * @access  Private
 */
router.get('/logs/:id', authenticate, asyncHandler(doorController.getVisitorLogById));

/**
 * @route   GET /api/door/stats
 * @desc    Get visitor statistics
 * @access  Private
 */
router.get('/stats', authenticate, asyncHandler(doorController.getVisitorStats));

module.exports = router;
