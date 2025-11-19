import axiosClient from './axiosClient';

export const dashboardApi = {
  // Get dashboard statistics
  getStats: async () => {
    const response = await axiosClient.get('/dashboard/stats');
    return response;
  },

  // Get recent activity
  getRecentActivity: async (limit = 10) => {
    const response = await axiosClient.get('/dashboard/activity', {
      params: { limit }
    });
    return response;
  },

  // Get devices summary
  getDevicesSummary: async () => {
    const response = await axiosClient.get('/dashboard/devices-summary');
    return response;
  },

  // Get alerts
  getAlerts: async () => {
    const response = await axiosClient.get('/dashboard/alerts');
    return response;
  },

  // Approve visitor access (grant access)
  approveVisitor: async (visitorLogId, notes = '') => {
    const response = await axiosClient.post('/command/open', {
      visitorLogId,
      notes
    });
    return response;
  },

  // Deny visitor access
  denyVisitor: async (visitorLogId, notes = '') => {
    const response = await axiosClient.post('/command/deny', {
      visitorLogId,
      notes
    });
    return response;
  },
};
