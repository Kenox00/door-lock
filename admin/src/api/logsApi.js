import axiosClient from './axiosClient';

export const logsApi = {
  // Get all logs (device events and visitor logs combined)
  getLogs: async (params = {}) => {
    const response = await axiosClient.get('/logs', { params });
    return response;
  },

  // Get logs by device
  getDeviceLogs: async (deviceId, params = {}) => {
    const response = await axiosClient.get(`/logs/device/${deviceId}`, { params });
    return response;
  },

  // Get logs by event type
  getLogsByType: async (type, params = {}) => {
    const response = await axiosClient.get(`/logs/type/${type}`, { params });
    return response;
  },

  // Get activity logs (device events only)
  getActivityLogs: async (params = {}) => {
    const response = await axiosClient.get('/logs/activity', { params });
    return response;
  },

  // Get visitor logs
  getVisitorLogs: async (params = {}) => {
    const response = await axiosClient.get('/logs/visitors', { params });
    return response;
  },

  // Get door/visitor logs (alias for visitor logs)
  getDoorLogs: async (params = {}) => {
    const response = await axiosClient.get('/door/logs', { params });
    return response;
  },

  // Get pending visitor logs
  getPendingLogs: async () => {
    const response = await axiosClient.get('/door/logs/pending');
    return response;
  },

  // Get visitor statistics
  getVisitorStats: async (params = {}) => {
    const response = await axiosClient.get('/door/stats', { params });
    return response;
  },

  // Clear old logs
  clearLogs: async (beforeDate) => {
    const response = await axiosClient.delete('/logs', {
      data: { beforeDate }
    });
    return response;
  },
};
