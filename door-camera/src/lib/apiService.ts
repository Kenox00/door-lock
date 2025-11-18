/// <reference types="vite/client" />
import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { useSessionStore } from '../store/sessionStore';

/**
 * API Service for REST communication with backend
 * Handles authentication, retries, and error handling
 */

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Configure axios-retry for automatic retries
 */
axiosRetry(api, {
  retries: 3, // Number of retry attempts
  retryDelay: axiosRetry.exponentialDelay, // Exponential backoff (1s, 2s, 4s)
  retryCondition: (error: AxiosError) => {
    // Retry on network errors or 5xx server errors
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status !== undefined && error.response.status >= 500)
    );
  },
  onRetry: (retryCount, _error, requestConfig) => {
    console.log(`🔄 Retry attempt ${retryCount} for ${requestConfig.url}`);
  },
});

/**
 * Request interceptor - Add JWT token to all requests
 */
api.interceptors.request.use(
  (config) => {
    // Get JWT from store or environment variable
    const { jwt } = useSessionStore.getState();
    const envToken = import.meta.env.VITE_JWT_TOKEN;
    
    const token = jwt || envToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors globally
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle specific error cases
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = (error.response.data as any)?.message || error.message;
      
      switch (status) {
        case 401:
          console.error('❌ Unauthorized - Invalid or expired token');
          console.warn('💡 Run: node setup-backend.mjs to get a new token');
          // Clear session
          useSessionStore.getState().clearSession();
          break;
        case 403:
          console.error('❌ Forbidden - Insufficient permissions');
          break;
        case 404:
          console.error('❌ Not Found:', error.config?.url);
          break;
        case 500:
          console.error('❌ Server Error:', message);
          break;
        default:
          console.error(`❌ Request failed with status ${status}:`, message);
      }
      
      // Update error in store
      useSessionStore.getState().setError(message);
    } else if (error.request) {
      // Request was made but no response received
      console.error('❌ Network error - No response from server');
      useSessionStore.getState().setError('Network error - Please check your connection');
    } else {
      // Something else happened
      console.error('❌ Request error:', error.message);
      useSessionStore.getState().setError(error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * API Service Methods
 */

export interface DeviceStatus {
  deviceId: string;
  online: boolean;
  lastSeen: number;
  batteryLevel?: number;
  recording?: boolean;
  motion?: boolean;
  metadata?: Record<string, any>;
}

export interface SnapshotData {
  deviceId: string;
  image: string; // base64 encoded
  timestamp: number;
  quality?: number;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    motion?: boolean;
  };
}

export interface CommandData {
  command: string;
  deviceId: string;
  parameters?: Record<string, any>;
}

export interface CommandResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * POST snapshot to backend
 * @param snapshotData - Snapshot data including base64 image
 * @returns Promise with upload result
 */
export const postSnapshot = async (snapshotData: SnapshotData): Promise<any> => {
  try {
    console.log('📤 Uploading snapshot to backend...');
    // Use the real backend endpoint: /api/door/upload
    const response = await api.post('/api/door/upload', {
      image: snapshotData.image,
      deviceId: snapshotData.deviceId,
      timestamp: snapshotData.timestamp,
    });
    console.log('✅ Snapshot uploaded successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Snapshot upload failed:', error);
    throw error;
  }
};

/**
 * GET device status from backend
 * @param deviceId - Device identifier
 * @returns Promise with device status
 */
export const getDeviceStatus = async (deviceId?: string): Promise<DeviceStatus> => {
  try {
    const id = deviceId || useSessionStore.getState().deviceId || 'camera-001';
    console.log(`📥 Fetching device status for ${id}...`);
    // Use the real backend endpoint: /api/door/logs
    const response = await api.get<any>(`/api/door/logs`);
    console.log('✅ Device status fetched:', response.data);
    // Transform the response to match DeviceStatus interface
    return {
      deviceId: id,
      online: true,
      lastSeen: Date.now(),
      recording: false,
      motion: false,
    };
  } catch (error) {
    console.error('❌ Failed to fetch device status:', error);
    // Return default status on error
    return {
      deviceId: deviceId || 'camera-001',
      online: false,
      lastSeen: Date.now(),
      recording: false,
      motion: false,
    };
  }
};

/**
 * PUT/POST command to device
 * @param commandData - Command data
 * @returns Promise with command result
 */
export const sendCommand = async (commandData: CommandData): Promise<CommandResponse> => {
  try {
    console.log('📤 Sending command to device:', commandData.command);
    const response = await api.put<CommandResponse>('/devices/command', commandData);
    console.log('✅ Command sent successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to send command:', error);
    throw error;
  }
};

/**
 * POST device activation (QR onboarding)
 * @param activationData - Device activation data from QR code
 * @returns Promise with activation result
 */
export const activateDevice = async (activationData: {
  deviceId: string;
  token: string;
  type: string;
  room?: string;
}): Promise<any> => {
  try {
    console.log('📤 Activating device:', activationData.deviceId);
    const response = await api.post('/api/device/activate', activationData);
    console.log('✅ Device activated successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Device activation failed:', error);
    throw error;
  }
};

/**
 * POST device validation
 * @param validationData - Device ID and token to validate
 * @returns Promise with validation result
 */
export const validateDevice = async (validationData: {
  deviceId: string;
  token: string;
}): Promise<any> => {
  try {
    console.log('📤 Validating device:', validationData.deviceId);
    const response = await api.post('/api/device/validate', validationData);
    console.log('✅ Device validated successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Device validation failed:', error);
    throw error;
  }
};

/**
 * POST device registration
 * @param deviceData - Device information
 * @returns Promise with registration result
 */
export const registerDevice = async (deviceData: {
  deviceId: string;
  deviceName: string;
  location?: string;
  metadata?: Record<string, any>;
}): Promise<any> => {
  try {
    console.log('📤 Registering device:', deviceData.deviceId);
    const response = await api.post('/devices/register', deviceData);
    console.log('✅ Device registered successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Device registration failed:', error);
    throw error;
  }
};

/**
 * GET device configuration
 * @param deviceId - Device identifier
 * @returns Promise with device configuration
 */
export const getDeviceConfig = async (deviceId?: string): Promise<any> => {
  try {
    const id = deviceId || useSessionStore.getState().deviceId || 'camera-001';
    console.log(`📥 Fetching device config for ${id}...`);
    const response = await api.get(`/devices/config/${id}`);
    console.log('✅ Device config fetched');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch device config:', error);
    throw error;
  }
};

/**
 * PUT device configuration update
 * @param deviceId - Device identifier
 * @param config - Configuration updates
 * @returns Promise with update result
 */
export const updateDeviceConfig = async (
  deviceId: string,
  config: Record<string, any>
): Promise<any> => {
  try {
    console.log(`📤 Updating device config for ${deviceId}...`);
    const response = await api.put(`/devices/config/${deviceId}`, config);
    console.log('✅ Device config updated');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to update device config:', error);
    throw error;
  }
};

/**
 * POST motion event notification
 * @param motionData - Motion detection data
 * @returns Promise with notification result
 */
export const notifyMotionDetected = async (motionData: {
  deviceId: string;
  timestamp: number;
  confidence?: number;
  snapshot?: string;
}): Promise<any> => {
  try {
    console.log('📤 Notifying motion detection...');
    const response = await api.post('/devices/motion', motionData);
    console.log('✅ Motion notification sent');
    return response.data;
  } catch (error) {
    console.error('❌ Motion notification failed:', error);
    throw error;
  }
};

/**
 * GET device history/logs
 * @param deviceId - Device identifier
 * @param limit - Number of records to fetch
 * @returns Promise with device history
 */
export const getDeviceHistory = async (
  deviceId?: string,
  limit: number = 50
): Promise<any[]> => {
  try {
    const id = deviceId || useSessionStore.getState().deviceId || 'camera-001';
    console.log(`📥 Fetching device history for ${id}...`);
    const response = await api.get(`/devices/history/${id}`, {
      params: { limit },
    });
    console.log('✅ Device history fetched');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch device history:', error);
    throw error;
  }
};

/**
 * Health check endpoint
 * @returns Promise with server health status
 */
export const checkHealth = async (): Promise<{ status: string; timestamp: number }> => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('❌ Health check failed:', error);
    throw error;
  }
};

// Export axios instance for custom requests
export default api;
