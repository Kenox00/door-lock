const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Authentication Routes
 * Base path: /api/auth
 */

/**
 * @route   POST /api/auth/register
 * @desc    Register new admin user
 * @access  Public
 */
router.post('/register', authLimiter, asyncHandler(authController.register));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, asyncHandler(authController.login));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(authController.getProfile));

/**
 * @route   PUT /api/auth/password
 * @desc    Update user password
 * @access  Private
 */
router.put('/password', authenticate, asyncHandler(authController.updatePassword));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (log event)
 * @access  Private
 */
router.post('/logout', authenticate, asyncHandler(authController.logout));

module.exports = router;
