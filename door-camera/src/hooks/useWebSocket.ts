/// <reference types="vite/client" />
import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useSessionStore } from '../store/sessionStore';
import { 
  EVENTS, 
  BackendCommandPayload, 
  AdminActionPayload 
} from '../lib/websocketEvents';

interface UseWebSocketReturn {
  emitEvent: (event: string, data?: any) => void;
  isConnected: boolean;
  socket: Socket | null;
  reconnecting: boolean;
  error: string | null;
}

interface WebSocketConfig {
  url?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export const useWebSocket = (config: WebSocketConfig = {}): UseWebSocketReturn => {
  const {
    url,
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = config;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const { 
    jwt, 
    deviceId,
    setConnectionStatus, 
    updateDeviceInfo,
    setError: setStoreError 
  } = useSessionStore();

  // Get WebSocket URL from config or environment
  const wsUrl = url || import.meta.env.VITE_WS_URL || 'http://localhost:5000';

  /**
   * Handle successful connection
   */
  const handleConnect = useCallback(() => {
    console.log('✅ WebSocket connected to:', wsUrl);
    console.log('🔑 Device ID:', deviceId);
    setIsConnected(true);
    setConnectionStatus('online');
    setReconnecting(false);
    setError(null);
    reconnectAttemptsRef.current = 0;
    
    // Update device info
    updateDeviceInfo({ online: true });
    
    // Get device credentials from store
    const { deviceToken, deviceType, room } = useSessionStore.getState();
    
    console.log('✅ Camera device authenticated and connected to device room');
    console.log('📍 Room:', room || 'Unknown');
    
    // Emit camera-online event
    if (socketRef.current) {
      socketRef.current.emit(EVENTS.CAMERA_ONLINE, {
        deviceId: deviceId,
        timestamp: Date.now(),
        metadata: {
          deviceName: 'ESP32-CAM Door Camera',
          location: room || 'Front Door',
          version: '1.0.0',
        },
      });
    }
  }, [wsUrl, deviceId, jwt, setConnectionStatus, updateDeviceInfo]);

  /**
   * Handle disconnection
   */
  const handleDisconnect = useCallback((reason: string) => {
    console.log('❌ WebSocket disconnected:', reason);
    setIsConnected(false);
    setConnectionStatus('offline');
    updateDeviceInfo({ online: false });
    // Note: We rely on Socket.IO's built-in auto-reconnect.
    // Manually calling connect() here can create tight reconnect loops.
  }, [setConnectionStatus, updateDeviceInfo]);

  /**
   * Handle connection errors
   */
  const handleConnectError = useCallback((err: Error) => {
    console.error('❌ WebSocket connection error:', err.message);
    const errorMessage = `Connection failed: ${err.message}`;
    setError(errorMessage);
    setStoreError(errorMessage);
    setConnectionStatus('offline');
  }, [setStoreError, setConnectionStatus]);

  /**
   * Handle reconnection attempts
   */
  const handleReconnectAttempt = useCallback((attemptNumber: number) => {
    console.log(`🔄 Reconnection attempt ${attemptNumber}/${reconnectionAttempts}`);
    setReconnecting(true);
    reconnectAttemptsRef.current = attemptNumber;
  }, [reconnectionAttempts]);

  /**
   * Handle successful reconnection
   */
  const handleReconnect = useCallback((attemptNumber: number) => {
    console.log(`✅ Reconnected after ${attemptNumber} attempts`);
    setReconnecting(false);
    setError(null);
  }, []);

  /**
   * Handle reconnection errors
   */
  const handleReconnectError = useCallback((err: Error) => {
    console.error('❌ Reconnection error:', err.message);
  }, []);

  /**
   * Handle reconnection failure (max attempts reached)
   */
  const handleReconnectFailed = useCallback(() => {
    console.error('❌ Reconnection failed - max attempts reached');
    const errorMessage = 'Unable to connect to server. Please check your connection.';
    setError(errorMessage);
    setStoreError(errorMessage);
    setReconnecting(false);
  }, [setStoreError]);

  /**
   * Handle backend commands
   */
  const handleBackendCommand = useCallback((data: BackendCommandPayload) => {
    console.log('📥 Backend command received:', data);
    
    switch (data.command) {
      case 'start-recording':
        updateDeviceInfo({ recording: true });
        console.log('🔴 Recording started');
        break;
      case 'stop-recording':
        updateDeviceInfo({ recording: false });
        console.log('⏹️ Recording stopped');
        break;
      case 'start_stream':
        // Start streaming frames at controlled FPS
        updateDeviceInfo({ recording: true });
        console.log('📹 Stream started');
        break;
      case 'stop_stream':
        // Stop streaming frames
        updateDeviceInfo({ recording: false });
        console.log('⏹️ Stream stopped');
        break;
      case 'restart_camera':
        // Restart camera by reloading page
        console.log('📷 Restarting camera...');
        window.location.reload();
        break;
      case 'adjust-settings':
        // Handle settings adjustment
        console.log('⚙️ Adjusting settings:', data.parameters);
        break;
      case 'capture-snapshot':
        // Trigger snapshot capture
        updateDeviceInfo({ captureRequested: true });
        console.log('📸 Snapshot requested');
        break;
      case 'reboot':
        // Handle reboot command - reload the page
        console.log('🔄 Reboot command received - restarting app...');
        setTimeout(() => window.location.reload(), 1000);
        break;
      default:
        console.warn('⚠️ Unknown command:', data.command);
    }
  }, [updateDeviceInfo]);

  /**
   * Handle admin actions
   */
  const handleAdminAction = useCallback((data: AdminActionPayload) => {
    console.log('👤 Admin action received:', data);
    
    switch (data.action) {
      case 'approve':
        console.log('Access approved by admin:', data.adminId);
        // Handle approval logic
        break;
      case 'deny':
        console.log('Access denied by admin:', data.adminId);
        // Handle denial logic
        break;
      case 'request-snapshot':
        updateDeviceInfo({ captureRequested: true });
        break;
      case 'change-settings':
        console.log('Settings changed by admin:', data.data);
        break;
      default:
        console.warn('Unknown admin action:', data.action);
    }
  }, [updateDeviceInfo]);

  /**
   * Handle access granted event
   */
  const handleAccessGranted = useCallback((data: any) => {
    console.log('✅ Access granted event received:', data);
    // Event will be handled by the Waiting page component
    // This is just a global handler for logging
  }, []);

  /**
   * Handle access denied event
   */
  const handleAccessDenied = useCallback((data: any) => {
    console.log('❌ Access denied event received:', data);
    // Event will be handled by the Waiting page component
    // This is just a global handler for logging
  }, []);

  /**
   * Handle new visitor event (for when admin receives visitor request)
   */
  const handleNewVisitor = useCallback((data: any) => {
    console.log('👤 New visitor event received:', data);
    // This confirms the visitor request was received by admin
  }, []);

  /**
   * Handle visitor processed event (for when admin responds)
   */
  const handleVisitorProcessed = useCallback((data: any) => {
    console.log('✅ Visitor processed event received:', data);
    // This shows the admin has responded to the visitor request
  }, []);

  /**
   * Heartbeat mechanism - send alive ping every 30 seconds
   */
  useEffect(() => {
    if (!isConnected || !socketRef.current) {
      return;
    }

    const heartbeatInterval = setInterval(() => {
      if (socketRef.current && isConnected) {
        // Align with backend event name and schema ('device_heartbeat')
        socketRef.current.emit('device_heartbeat', {
          deviceId: deviceId || 'camera-001',
          status: 'online',
          metadata: { source: 'camera-app' },
        });
        console.log('💓 Heartbeat sent (device_heartbeat)');
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, [isConnected, deviceId]);

  /**
   * Initialize WebSocket connection
   */
  useEffect(() => {
    if (!autoConnect) {
      return;
    }

    // Prevent reconnecting if already connected OR connecting
    if (socketRef.current?.connected || socketRef.current?.connecting) {
      console.log('✅ WebSocket already connected/connecting, skipping initialization');
      return;
    }

    // Clean up any existing socket first
    if (socketRef.current) {
      console.log('🔄 Cleaning up existing socket before reconnect');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Get device credentials from store
    const { deviceToken, isActivated } = useSessionStore.getState();

    // Debug: Log what we have
    console.log('🔍 WebSocket Credentials Check:', {
      hasDeviceId: !!deviceId,
      hasDeviceToken: !!deviceToken,
      isActivated: isActivated,
      deviceIdValue: deviceId,
      tokenPreview: deviceToken ? deviceToken.substring(0, 10) + '...' : 'MISSING'
    });

    // Wait for device credentials before connecting
    if (!deviceId || !deviceToken) {
      console.warn('⚠️ No device credentials available, waiting for device onboarding...');
      console.warn('💡 Please scan QR code to onboard this device');
      return;
    }

    console.log('🔌 Initializing WebSocket connection as DEVICE...');
    console.log('📱 Device ID:', deviceId);
    console.log('🔑 Token (first 10 chars):', deviceToken.substring(0, 10) + '...');

    // Create socket instance with DEVICE authentication
    socketRef.current = io(wsUrl, {
      auth: {
        token: deviceToken, // Device token (NOT JWT) for device authentication
        deviceId: deviceId, // Device MongoDB ID
        clientType: 'device', // CRITICAL: Identify as device client
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: reconnectionAttempts,
      reconnectionDelay: reconnectionDelay,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
    });

    const socket = socketRef.current;

    // Register event listeners
    socket.on(EVENTS.CONNECT, handleConnect);
    socket.on(EVENTS.DISCONNECT, handleDisconnect);
    socket.on(EVENTS.CONNECT_ERROR, handleConnectError);
    socket.on(EVENTS.RECONNECT_ATTEMPT, handleReconnectAttempt);
    socket.on(EVENTS.RECONNECT, handleReconnect);
    socket.on(EVENTS.RECONNECT_ERROR, handleReconnectError);
    socket.on(EVENTS.RECONNECT_FAILED, handleReconnectFailed);
    
    // Application-specific events
    socket.on(EVENTS.BACKEND_COMMAND, handleBackendCommand);
    socket.on(EVENTS.ADMIN_ACTION, handleAdminAction);
    socket.on(EVENTS.ACCESS_GRANTED, handleAccessGranted);
    socket.on(EVENTS.ACCESS_DENIED, handleAccessDenied);
    socket.on('new_visitor', handleNewVisitor);
    socket.on('visitor_processed', handleVisitorProcessed);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up WebSocket connection...');
      socket.off(EVENTS.CONNECT, handleConnect);
      socket.off(EVENTS.DISCONNECT, handleDisconnect);
      socket.off(EVENTS.CONNECT_ERROR, handleConnectError);
      socket.off(EVENTS.RECONNECT_ATTEMPT, handleReconnectAttempt);
      socket.off(EVENTS.RECONNECT, handleReconnect);
      socket.off(EVENTS.RECONNECT_ERROR, handleReconnectError);
      socket.off(EVENTS.RECONNECT_FAILED, handleReconnectFailed);
      socket.off(EVENTS.BACKEND_COMMAND, handleBackendCommand);
      socket.off(EVENTS.ADMIN_ACTION, handleAdminAction);
      socket.off(EVENTS.ACCESS_GRANTED, handleAccessGranted);
      socket.off(EVENTS.ACCESS_DENIED, handleAccessDenied);
      socket.off('new_visitor', handleNewVisitor);
      socket.off('visitor_processed', handleVisitorProcessed);
      
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    wsUrl,
    deviceId,
    autoConnect,
    reconnectionAttempts,
    reconnectionDelay,
  ]);
  // NOTE: Handler functions are NOT in dependencies to prevent reconnection loops

  /**
   * Emit event to backend
   */
  const emitEvent = useCallback((event: string, data?: any) => {
    if (!socketRef.current) {
      console.error('❌ WebSocket not initialized');
      return;
    }

    if (!isConnected) {
      console.warn('⚠️ WebSocket not connected, queueing event:', event);
      // Socket.io will queue the event and send when reconnected
    }

    try {
      socketRef.current.emit(event, data);
      console.log('📤 Event emitted:', event, data);
    } catch (err) {
      console.error('❌ Error emitting event:', err);
    }
  }, [isConnected]);

  return {
    emitEvent,
    isConnected,
    socket: socketRef.current,
    reconnecting,
    error,
  };
};
