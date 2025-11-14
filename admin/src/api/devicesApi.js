import axiosClient from './axiosClient';

export const devicesApi = {
  // Get all devices
  getAllDevices: async () => {
    const response = await axiosClient.get('/devices');
    return response;
  },

  // Get single device
  getDevice: async (deviceId) => {
    const response = await axiosClient.get(`/devices/${deviceId}`);
    return response;
  },

  // Device control actions
  turnOn: async (deviceId) => {
    const response = await axiosClient.post(`/devices/${deviceId}/on`);
    return response;
  },

  turnOff: async (deviceId) => {
    const response = await axiosClient.post(`/devices/${deviceId}/off`);
    return response;
  },

  setBrightness: async (deviceId, brightness) => {
    const response = await axiosClient.post(`/devices/${deviceId}/brightness`, { 
      brightness 
    });
    return response;
  },

  // Door lock specific
  lockDoor: async (deviceId) => {
    const response = await axiosClient.post('/doorlock/lock', { deviceId });
    return response;
  },

  unlockDoor: async (deviceId) => {
    const response = await axiosClient.post('/doorlock/unlock', { deviceId });
    return response;
  },

  // Get device status
  getDeviceStatus: async (deviceId) => {
    const response = await axiosClient.get(`/devices/${deviceId}/status`);
    return response;
  },

  // Get device history
  getDeviceHistory: async (deviceId, params = {}) => {
    const response = await axiosClient.get(`/devices/${deviceId}/history`, { params });
    return response;
  },

  // Update device settings
  updateDevice: async (deviceId, settings) => {
    const response = await axiosClient.put(`/devices/${deviceId}`, settings);
    return response;
  },

  // Delete device
  deleteDevice: async (deviceId) => {
    const response = await axiosClient.delete(`/devices/${deviceId}`);
    return response;
  },
};
