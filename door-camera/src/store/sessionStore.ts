import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Device Information Interface
 */
interface DeviceInfo {
  online: boolean;
  motion: boolean;
  bell: boolean;
  recording?: boolean;
  captureRequested?: boolean;
  batteryLevel?: number;
  lastSeen?: number;
  metadata?: Record<string, any>;
}

/**
 * Session Store Interface
 * Manages device state, WebSocket connection, and session data
 */
interface SessionState {
  // Session data
  sessionId: string | null;
  lastCapturedPhoto: string | null;
  cameraReady: boolean;
  error: string | null;
  
  // WebSocket connection
  connectionStatus: 'online' | 'offline';
  
  // Device information
  deviceId: string;
  deviceInfo: DeviceInfo;
  
  // JWT authentication
  jwt: string | null;
  
  // QR onboarding fields
  deviceType: string | null;
  room: string | null;
  deviceToken: string | null;
  isActivated: boolean;
  
  // Actions
  setSessionId: (id: string) => void;
  setLastCapturedPhoto: (photo: string) => void;
  setConnectionStatus: (status: 'online' | 'offline') => void;
  setCameraReady: (ready: boolean) => void;
  setError: (error: string | null) => void;
  setDeviceId: (id: string) => void;
  updateDeviceInfo: (info: Partial<DeviceInfo>) => void;
  setJwt: (token: string | null) => void;
  setDeviceType: (type: string | null) => void;
  setRoom: (room: string | null) => void;
  setDeviceToken: (token: string | null) => void;
  setActivated: (activated: boolean) => void;
  clearSession: () => void;
  resetDeviceInfo: () => void;
}

/**
 * Initial device info state
 */
const initialDeviceInfo: DeviceInfo = {
  online: false,
  motion: false,
  bell: false,
  recording: false,
  captureRequested: false,
  batteryLevel: 100,
  lastSeen: Date.now(),
};

/**
 * Session Store with Zustand
 * Persists JWT and deviceId to localStorage
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessionId: null,
      lastCapturedPhoto: null,
      connectionStatus: 'offline',
      cameraReady: false,
      error: null,
      deviceId: 'camera-001', // Default device ID
      deviceInfo: initialDeviceInfo,
      jwt: null,
      
      // QR onboarding
      deviceType: null,
      room: null,
      deviceToken: null,
      isActivated: false,

      // Actions
      setSessionId: (id) => set({ sessionId: id }),
      
      setLastCapturedPhoto: (photo) => set({ lastCapturedPhoto: photo }),
      
      setConnectionStatus: (status) => {
        set({ connectionStatus: status });
        // Update device info online status
        set((state) => ({
          deviceInfo: {
            ...state.deviceInfo,
            online: status === 'online',
            lastSeen: Date.now(),
          },
        }));
      },
      
      setCameraReady: (ready) => set({ cameraReady: ready }),
      
      setError: (error) => set({ error }),
      
      setDeviceId: (id) => set({ deviceId: id }),
      
      updateDeviceInfo: (info) =>
        set((state) => ({
          deviceInfo: {
            ...state.deviceInfo,
            ...info,
            lastSeen: Date.now(),
          },
        })),
      
      setJwt: (token) => set({ jwt: token }),
      
      setDeviceType: (type) => set({ deviceType: type }),
      
      setRoom: (room) => set({ room }),
      
      setDeviceToken: (token) => set({ deviceToken: token }),
      
      setActivated: (activated) => set({ isActivated: activated }),
      
      clearSession: () =>
        set({
          sessionId: null,
          lastCapturedPhoto: null,
          error: null,
          connectionStatus: 'offline',
          jwt: null,
        }),
      
      resetDeviceInfo: () => set({ deviceInfo: initialDeviceInfo }),
    }),
    {
      name: 'door-camera-session', // localStorage key
      partialize: (state) => ({
        // Persist all device identification fields
        deviceId: state.deviceId,
        jwt: state.jwt,
        deviceType: state.deviceType,
        room: state.room,
        deviceToken: state.deviceToken,
        isActivated: state.isActivated,
      }),
    }
  )
);
