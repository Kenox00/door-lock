import axiosClient from './axiosClient';

export const cameraApi = {
  // Get camera stream URL
  getStreamUrl: async (cameraId) => {
    const response = await axiosClient.get('/camera/stream-url', {
      params: { cameraId }
    });
    return response;
  },

  // Get camera snapshot
  getSnapshot: async (cameraId) => {
    const response = await axiosClient.get('/camera/snapshot', {
      params: { cameraId },
      responseType: 'blob',
    });
    return response;
  },

  // Get all cameras
  getAllCameras: async () => {
    const response = await axiosClient.get('/camera/list');
    return response;
  },

  // Start recording
  startRecording: async (cameraId) => {
    const response = await axiosClient.post('/camera/record/start', { cameraId });
    return response;
  },

  // Stop recording
  stopRecording: async (cameraId) => {
    const response = await axiosClient.post('/camera/record/stop', { cameraId });
    return response;
  },

  // Get recordings
  getRecordings: async (cameraId, params = {}) => {
    const response = await axiosClient.get('/camera/recordings', {
      params: { cameraId, ...params }
    });
    return response;
  },

  // Update camera settings
  updateCameraSettings: async (cameraId, settings) => {
    const response = await axiosClient.put(`/camera/${cameraId}/settings`, settings);
    return response;
  },
};
