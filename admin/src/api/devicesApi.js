import axiosClient from './axiosClient';

export const devicesApi = {
  // Get all devices
  getAllDevices: async (params = {}) => {
    const response = await axiosClient.get('/device', { params });
    return response;
  },

  // Get device statistics
  getDeviceStats: async () => {
    const response = await axiosClient.get('/device/stats');
    return response;
  },

  // Get single device
  getDevice: async (deviceId) => {
    const response = await axiosClient.get(`/device/${deviceId}`);
    return response;
  },

  // Register new device
  registerDevice: async (deviceData) => {
    const response = await axiosClient.post('/device/register', deviceData);
    return response;
  },

  // Update device settings
  updateDevice: async (deviceId, settings) => {
    const response = await axiosClient.put(`/device/${deviceId}`, settings);
    return response;
  },

  // Delete device
  deleteDevice: async (deviceId) => {
    const response = await axiosClient.delete(`/device/${deviceId}`);
    return response;
  },

  // Device heartbeat
  deviceHeartbeat: async (deviceId, metadata = {}) => {
    const response = await axiosClient.post(`/device/${deviceId}/heartbeat`, { metadata });
    return response;
  },

  // Door lock specific (via command controller)
  lockDoor: async (visitorLogId) => {
    const response = await axiosClient.post('/command/deny', { visitorLogId });
    return response;
  },

  unlockDoor: async (visitorLogId, notes) => {
    const response = await axiosClient.post('/command/open', { visitorLogId, notes });
    return response;
  },

  // Get device logs
  getDeviceLogs: async (deviceId, params = {}) => {
    const response = await axiosClient.get(`/logs/device/${deviceId}`, { params });
    return response;
  },

  // Get device QR code
  getDeviceQR: async (deviceId) => {
    const response = await axiosClient.get(`/device/${deviceId}/qr`);
    return response;
  },

  // Activate device (called when QR is scanned)
  activateDevice: async (deviceId, token) => {
    const response = await axiosClient.post('/device/activate', { deviceId, token });
    return response;
  },
};
