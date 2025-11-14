const { User } = require('../models');
const { generateToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');
const { validateRequiredFields, isValidEmail, isValidPassword, isValidUsername } = require('../utils/validators');
const logger = require('../utils/logger');

/**
 * Authentication Controller
 * Handles user registration, login, and authentication
 */

/**
 * Register new admin user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['username', 'email', 'password']);
    if (!validation.isValid) {
      return errorResponse(res, `Missing required fields: ${validation.missing.join(', ')}`, 400);
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return errorResponse(res, 'Invalid email format', 400);
    }

    // Validate username format
    if (!isValidUsername(username)) {
      return errorResponse(res, 'Username must be 3-30 characters, alphanumeric and underscore only', 400);
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return errorResponse(res, 'Password must be at least 6 characters', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] 
    });

    if (existingUser) {
      return errorResponse(res, 'Username or email already exists', 400);
    }

    // Create new user
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by pre-save hook
      role: role || 'admin'
    });

    await user.save();

    // Generate JWT token
    const token = generateToken({ userId: user._id, username: user.username, role: user.role });

    logger.info(`New user registered: ${user.username}`);

    return successResponse(res, {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    }, 'User registered successfully', 201);

  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['email', 'password']);
    if (!validation.isValid) {
      return errorResponse(res, `Missing required fields: ${validation.missing.join(', ')}`, 400);
    }

    // Find user by email
    const user = await User.findOne({
      email: email.toLowerCase()
    });

    if (!user) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse(res, 'Account is inactive', 401);
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken({ userId: user._id, username: user.username, role: user.role });

    logger.info(`User logged in: ${user.username}`);

    return successResponse(res, {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      },
      token
    }, 'Login successful');

  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    }, 'Profile retrieved successfully');

  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update user password
 * PUT /api/auth/password
 */
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['currentPassword', 'newPassword']);
    if (!validation.isValid) {
      return errorResponse(res, `Missing required fields: ${validation.missing.join(', ')}`, 400);
    }

    // Validate new password strength
    if (!isValidPassword(newPassword)) {
      return errorResponse(res, 'New password must be at least 6 characters', 400);
    }

    const user = await User.findById(req.user.userId);

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return errorResponse(res, 'Current password is incorrect', 401);
    }

    // Update password
    user.passwordHash = newPassword; // Will be hashed by pre-save hook
    await user.save();

    logger.info(`Password updated for user: ${user.username}`);

    return successResponse(res, null, 'Password updated successfully');

  } catch (error) {
    logger.error(`Update password error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Logout (client-side token removal, but can log event)
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    logger.info(`User logged out: ${req.user.username}`);
    return successResponse(res, null, 'Logout successful');
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updatePassword,
  logout
};
