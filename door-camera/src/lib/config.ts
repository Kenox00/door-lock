import { useSessionStore } from '../store/sessionStore';

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 30000,
  uploadEndpoint: '/api/door/upload',
  logsEndpoint: '/api/door/logs',
  socketPath: '/socket.io',
  // Get device ID dynamically from session store
  get deviceId() {
    return useSessionStore.getState().deviceId || '67456789abcdef1234567890';
  }
};

export const CAMERA_CONFIG = {
  facingMode: 'environment', // rear camera
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 30 },
};

export const COMPRESSION_CONFIG = {
  quality: 0.8,
  maxWidth: 1920,
  maxHeight: 1080,
  mimeType: 'image/jpeg',
};

export const TIMINGS = {
  captureDelay: 200, // ms
  buttonDisableDuration: 3000, // ms
  approvedRedirectDelay: 5000, // ms
  deniedRedirectDelay: 5000, // ms
  cameraRetryDelay: 2000, // ms
};
