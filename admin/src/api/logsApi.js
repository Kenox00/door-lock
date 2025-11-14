import axiosClient from './axiosClient';

export const logsApi = {
  // Get all logs
  getLogs: async (params = {}) => {
    const response = await axiosClient.get('/logs', { params });
    return response;
  },

  // Get logs by device
  getDeviceLogs: async (deviceId, params = {}) => {
    const response = await axiosClient.get(`/logs/device/${deviceId}`, { params });
    return response;
  },

  // Get logs by type
  getLogsByType: async (type, params = {}) => {
    const response = await axiosClient.get(`/logs/type/${type}`, { params });
    return response;
  },

  // Get activity logs
  getActivityLogs: async (params = {}) => {
    const response = await axiosClient.get('/logs/activity', { params });
    return response;
  },

  // Get security logs
  getSecurityLogs: async (params = {}) => {
    const response = await axiosClient.get('/logs/security', { params });
    return response;
  },

  // Get visitor logs
  getVisitorLogs: async (params = {}) => {
    const response = await axiosClient.get('/logs/visitors', { params });
    return response;
  },

  // Export logs
  exportLogs: async (params = {}) => {
    const response = await axiosClient.get('/logs/export', {
      params,
      responseType: 'blob',
    });
    return response;
  },

  // Clear logs
  clearLogs: async (beforeDate) => {
    const response = await axiosClient.delete('/logs', {
      data: { beforeDate }
    });
    return response;
  },
};
