/**
 * Model exports
 * Central export point for all Mongoose models
 */
const User = require('./User');
const VisitorLog = require('./VisitorLog');
const Device = require('./Device');

module.exports = {
  User,
  VisitorLog,
  Device
};
