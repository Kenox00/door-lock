import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../utils/storage';

/**
 * WebSocket Events from Backend
 */
export const SOCKET_EVENTS = {
  // Device Events
  DEVICE_CONNECTED: 'device_connected',
  DEVICE_DISCONNECTED: 'device_disconnected',
  DEVICE_STATUS: 'device_status',
  
  // Visitor Events
  NEW_VISITOR: 'new_visitor',
  VISITOR_PROCESSED: 'visitor_processed',
  VISITOR_APPROVAL: 'visitor_approval',
  VISITOR_REJECTION: 'visitor_rejection',
  
  // Command Events
  COMMAND_STATUS: 'command_status',
  
  // System Events
  SYSTEM_ALERT: 'system_alert',
  
  // Client → Server
  SUBSCRIBE_DEVICE: 'subscribe_device',
  UNSUBSCRIBE_DEVICE: 'unsubscribe_device',
  SEND_COMMAND: 'send_command',
  REQUEST_DEVICE_STATUS: 'request_device_status',
};

/**
 * useWebSocket Hook
 * Handles Socket.IO connection with authentication and event management
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoConnect - Auto-connect on mount (default: true)
 * @param {Object} options.handlers - Event handlers { eventName: callback }
 * @returns {Object} Socket instance and helper methods
 */
export const useWebSocket = (options = {}) => {
  const { autoConnect = true, handlers = {} } = options;
  
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const handlersRef = useRef(handlers);

  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  /**
   * Connect to Socket.IO server with JWT authentication
   */
  const connect = useCallback(() => {
    const token = getToken();
    
    if (!token) {
      console.error('❌ Cannot connect to WebSocket: No authentication token');
      setConnectionError('No authentication token');
      return;
    }

    const serverUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

    console.log('🔌 Connecting to WebSocket:', serverUrl);

    try {
      socketRef.current = io(serverUrl, {
        auth: {
          token,
          clientType: 'dashboard'
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        timeout: 20000
      });

      // Connection successful
      socketRef.current.on('connect', () => {
        console.log('✅ WebSocket connected:', socketRef.current.id);
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
      });

      // Connection error
      socketRef.current.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error.message);
        setIsConnected(false);
        setConnectionError(error.message);
        
        // If authentication error, don't retry
        if (error.message === 'Invalid token' || error.message === 'Authentication required') {
          console.error('🔐 Authentication failed - token may be invalid');
          socketRef.current?.disconnect();
        }
      });

      // Disconnected
      socketRef.current.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // Server disconnected us - try to reconnect
          console.log('🔄 Server disconnected - attempting reconnect...');
          socketRef.current?.connect();
        }
      });

      // Reconnection attempts
      socketRef.current.on('reconnect_attempt', (attempt) => {
        console.log(`🔄 Reconnection attempt ${attempt}...`);
        setReconnectAttempts(attempt);
      });

      socketRef.current.on('reconnect', (attempt) => {
        console.log(`✅ Reconnected after ${attempt} attempts`);
        setReconnectAttempts(0);
      });

      socketRef.current.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after maximum attempts');
        setConnectionError('Failed to reconnect');
      });

      // Subscribe confirmation
      socketRef.current.on('subscribed', (data) => {
        console.log('✅ Subscribed to device:', data.deviceId);
      });

      socketRef.current.on('unsubscribed', (data) => {
        console.log('✅ Unsubscribed from device:', data.deviceId);
      });

      // Generic error handler
      socketRef.current.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

      // Set up custom event handlers
      Object.entries(handlersRef.current).forEach(([event, handler]) => {
        if (typeof handler === 'function') {
          socketRef.current.on(event, handler);
        }
      });

    } catch (error) {
      console.error('❌ Error creating socket:', error);
      setConnectionError(error.message);
    }
  }, []);

  /**
   * Disconnect from Socket.IO server
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting WebSocket...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  /**
   * Subscribe to device updates
   */
  const subscribeToDevice = useCallback((deviceId) => {
    if (socketRef.current?.connected) {
      console.log('📡 Subscribing to device:', deviceId);
      socketRef.current.emit(SOCKET_EVENTS.SUBSCRIBE_DEVICE, { deviceId });
      return true;
    }
    console.warn('⚠️ Cannot subscribe: Socket not connected');
    return false;
  }, []);

  /**
   * Unsubscribe from device updates
   */
  const unsubscribeFromDevice = useCallback((deviceId) => {
    if (socketRef.current?.connected) {
      console.log('📡 Unsubscribing from device:', deviceId);
      socketRef.current.emit(SOCKET_EVENTS.UNSUBSCRIBE_DEVICE, { deviceId });
      return true;
    }
    return false;
  }, []);

  /**
   * Send command to device
   */
  const sendCommand = useCallback((deviceId, command, payload = {}) => {
    if (socketRef.current?.connected) {
      console.log(`📤 Sending command to device ${deviceId}:`, command);
      socketRef.current.emit(SOCKET_EVENTS.SEND_COMMAND, {
        deviceId,
        command,
        payload
      });
      return true;
    }
    console.warn('⚠️ Cannot send command: Socket not connected');
    return false;
  }, []);

  /**
   * Request device status
   */
  const requestDeviceStatus = useCallback((deviceId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(SOCKET_EVENTS.REQUEST_DEVICE_STATUS, { deviceId });
      return true;
    }
    return false;
  }, []);

  /**
   * Listen to specific event
   */
  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
      return () => {
        socketRef.current?.off(event, handler);
      };
    }
  }, []);

  /**
   * Remove event listener
   */
  const off = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  /**
   * Emit custom event
   */
  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    return false;
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Update event handlers when they change
  useEffect(() => {
    if (!socketRef.current) return;

    // Remove old handlers
    Object.keys(handlersRef.current).forEach((event) => {
      socketRef.current.off(event);
    });

    // Add new handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      if (typeof handler === 'function') {
        socketRef.current.on(event, handler);
      }
    });
  }, [handlers]);

  return {
    isConnected,
    connectionError,
    reconnectAttempts,
    connect,
    disconnect,
    subscribeToDevice,
    unsubscribeFromDevice,
    sendCommand,
    requestDeviceStatus,
    on,
    off,
    emit,
  };
};

export default useWebSocket;
