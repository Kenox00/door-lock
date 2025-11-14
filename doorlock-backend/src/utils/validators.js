/**
 * Input Validation Utilities
 * Reusable validation functions
 */

/**
 * Validate Email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Password Strength
 * At least 6 characters
 */
const isValidPassword = (password) => {
  return password && password.length >= 6;
};

/**
 * Validate Username
 * 3-30 characters, alphanumeric and underscore
 */
const isValidUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

/**
 * Sanitize Input
 * Remove potentially harmful characters
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .slice(0, 500); // Limit length
};

/**
 * Validate Required Fields
 */
const validateRequiredFields = (data, requiredFields) => {
  const missing = [];
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      missing.push(field);
    }
  });
  
  return {
    isValid: missing.length === 0,
    missing
  };
};

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  isValidObjectId,
  sanitizeInput,
  validateRequiredFields
};
