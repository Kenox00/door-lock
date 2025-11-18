/**
 * WebSocket Event Constants
 * Shared event schema for Camera App ↔ Backend ↔ Admin Dashboard
 */

export const EVENTS = {
  // Events emitted by Camera App
  CAMERA_ONLINE: 'camera-online',
  MOTION_DETECTED: 'motion-detected',
  BELL_PRESSED: 'bell-pressed',
  SNAPSHOT: 'snapshot',
  
  // Events received by Camera App (from Backend)
  BACKEND_COMMAND: 'backend-command',
  ADMIN_ACTION: 'admin-action',
  ACCESS_GRANTED: 'access_granted',
  ACCESS_DENIED: 'access_denied',
  
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECT_ERROR: 'reconnect_error',
  RECONNECT_FAILED: 'reconnect_failed',
} as const;

export type EventType = typeof EVENTS[keyof typeof EVENTS];

/**
 * Event Payload Interfaces
 */

export interface CameraOnlinePayload {
  deviceId: string;
  timestamp: number;
  metadata?: {
    deviceName?: string;
    location?: string;
    version?: string;
  };
}

export interface MotionDetectedPayload {
  deviceId: string;
  timestamp: number;
  confidence?: number;
  snapshot?: string; // base64 image
  metadata?: {
    zone?: string;
    sensitivity?: number;
  };
}

export interface BellPressedPayload {
  deviceId: string;
  timestamp: number;
  pressedBy?: string;
  metadata?: {
    location?: string;
    duration?: number;
  };
}

export interface SnapshotPayload {
  deviceId: string;
  timestamp: number;
  image: string; // base64 encoded
  quality?: number;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
  };
}

export interface BackendCommandPayload {
  command: 'start-recording' | 'stop-recording' | 'adjust-settings' | 'capture-snapshot' | 'reboot' | 'start_stream' | 'stop_stream' | 'restart_camera';
  deviceId: string;
  timestamp: number;
  parameters?: Record<string, any>;
}

export interface AdminActionPayload {
  action: 'approve' | 'deny' | 'request-snapshot' | 'change-settings';
  deviceId: string;
  timestamp: number;
  adminId?: string;
  data?: Record<string, any>;
}
