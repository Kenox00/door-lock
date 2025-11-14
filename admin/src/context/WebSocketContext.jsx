import { createContext, useContext, useEffect, useCallback } from 'react';
import { useWebSocket, SOCKET_EVENTS } from '../hooks/useWebSocket';
import { useNotification } from './NotificationContext';
import { useDevices } from '../hooks/useDevices';

const WebSocketContext = createContext(null);

/**
 * WebSocketProvider Component
 * Manages WebSocket connection and real-time event handling
 */
export const WebSocketProvider = ({ children }) => {
  const notification = useNotification();
  const { updateDeviceState, devices, refreshDevices } = useDevices();

  /**
   * Handle device connected event
   */
  const handleDeviceConnected = useCallback((data) => {
    console.log('📡 Device connected:', data);
    
    const { deviceId, deviceName, deviceType, connectionType } = data;
    
    // Update device status in context
    updateDeviceState(deviceId, { 
      status: 'online',
      lastSeen: new Date().toISOString(),
      connectionType 
    });
    
    // Show notification
    notification.deviceConnected(deviceName, deviceType);
  }, [updateDeviceState, notification]);

  /**
   * Handle device disconnected event
   */
  const handleDeviceDisconnected = useCallback((data) => {
    console.log('📡 Device disconnected:', data);
    
    const { deviceId, deviceName, deviceType } = data;
    
    // Update device status in context
    updateDeviceState(deviceId, { 
      status: 'offline',
      lastSeen: new Date().toISOString() 
    });
    
    // Show notification
    notification.deviceDisconnected(deviceName, deviceType);
  }, [updateDeviceState, notification]);

  /**
   * Handle device status update event
   */
  const handleDeviceStatus = useCallback((data) => {
    console.log('📡 Device status update:', data);
    
    const { deviceId, status, deviceName } = data;
    
    // Update device state
    updateDeviceState(deviceId, status);
    
    // Show specific notifications for certain status changes
    if (status.lockState !== undefined && deviceName) {
      notification.doorStateChanged(deviceName, status.lockState === 'locked');
    }
    
    if (status.motionDetected && deviceName) {
      notification.motionDetected(deviceName, new Date().toISOString());
    }
  }, [updateDeviceState, notification]);

  /**
   * Handle new visitor event
   */
  const handleNewVisitor = useCallback((data) => {
    console.log('📡 New visitor detected:', data);
    
    // Add to notification list
    notification.addVisitorNotification(data);
    
    // Show toast notification
    notification.newVisitor(data.deviceName || 'Unknown');
    
    // Refresh devices to get updated visitor logs
    setTimeout(() => refreshDevices(), 1000);
  }, [notification, refreshDevices]);

  /**
   * Handle visitor processed event
   */
  const handleVisitorProcessed = useCallback((data) => {
    console.log('📡 Visitor processed:', data);
    
    const { visitorId, status, deviceName } = data;
    
    // Show notification
    notification.visitorProcessed(deviceName || 'visitor', status);
    
    // Refresh devices to get updated status
    setTimeout(() => refreshDevices(), 1000);
  }, [notification, refreshDevices]);

  /**
   * Handle command status event
   */
  const handleCommandStatus = useCallback((data) => {
    console.log('📡 Command status:', data);
    
    const { deviceId, command, status, message } = data;
    
    // Find device name
    const device = devices.find(d => d._id === deviceId);
    const deviceName = device?.name || 'Device';
    
    // Show notification
    notification.commandStatus(deviceName, command, status, message);
    
    // If command completed, refresh device state
    if (status === 'completed' || status === 'success') {
      setTimeout(() => refreshDevices(), 500);
    }
  }, [devices, notification, refreshDevices]);

  /**
   * Handle system alert event
   */
  const handleSystemAlert = useCallback((data) => {
    console.log('📡 System alert:', data);
    
    const { message, severity } = data;
    
    // Show alert notification
    notification.systemAlert(message, severity);
  }, [notification]);

  /**
   * Initialize WebSocket with event handlers
   */
  const {
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
  } = useWebSocket({
    autoConnect: true,
    handlers: {
      [SOCKET_EVENTS.DEVICE_CONNECTED]: handleDeviceConnected,
      [SOCKET_EVENTS.DEVICE_DISCONNECTED]: handleDeviceDisconnected,
      [SOCKET_EVENTS.DEVICE_STATUS]: handleDeviceStatus,
      [SOCKET_EVENTS.NEW_VISITOR]: handleNewVisitor,
      [SOCKET_EVENTS.VISITOR_PROCESSED]: handleVisitorProcessed,
      [SOCKET_EVENTS.COMMAND_STATUS]: handleCommandStatus,
      [SOCKET_EVENTS.SYSTEM_ALERT]: handleSystemAlert,
    },
  });

  /**
   * Subscribe to all devices when connected or when devices change
   */
  useEffect(() => {
    if (!isConnected || !devices || devices.length === 0) return;

    console.log('📡 Subscribing to', devices.length, 'devices...');
    
    // Subscribe to each device
    devices.forEach(device => {
      if (device._id) {
        subscribeToDevice(device._id);
      }
    });

    // Cleanup: unsubscribe when component unmounts or devices change
    return () => {
      devices.forEach(device => {
        if (device._id) {
          unsubscribeFromDevice(device._id);
        }
      });
    };
  }, [isConnected, devices, subscribeToDevice, unsubscribeFromDevice]);

  /**
   * Show notification on connection status changes
   */
  useEffect(() => {
    if (isConnected) {
      notification.success('Connected to server');
    } else if (connectionError) {
      notification.error(`Connection error: ${connectionError}`);
    }
  }, [isConnected, connectionError, notification]);

  /**
   * Send command to device with optimistic update
   */
  const sendDeviceCommand = useCallback(async (deviceId, command, payload = {}) => {
    console.log(`📤 Sending command to device ${deviceId}:`, command, payload);
    
    // Send via WebSocket
    const sent = sendCommand(deviceId, command, payload);
    
    if (sent) {
      // Show pending notification
      const device = devices.find(d => d._id === deviceId);
      notification.commandStatus(device?.name || 'Device', command, 'pending');
      
      // Optimistic update for certain commands
      if (command === 'unlock' || command === 'lock') {
        updateDeviceState(deviceId, {
          lockState: command === 'unlock' ? 'unlocked' : 'locked',
        });
      } else if (command === 'toggle') {
        updateDeviceState(deviceId, {
          isOn: !device?.isOn,
        });
      }
      
      return true;
    } else {
      notification.error('Failed to send command - not connected');
      return false;
    }
  }, [sendCommand, devices, updateDeviceState, notification]);

  /**
   * Request current status for a device
   */
  const getDeviceStatus = useCallback((deviceId) => {
    return requestDeviceStatus(deviceId);
  }, [requestDeviceStatus]);

  /**
   * Approve visitor access
   */
  const approveVisitor = useCallback((visitorId, note = '') => {
    console.log('✅ Approving visitor:', visitorId);
    
    emit(SOCKET_EVENTS.VISITOR_APPROVAL, {
      visitorId,
      approved: true,
      note,
      timestamp: new Date().toISOString(),
    });

    // Update notification status locally (backend will send confirmation)
    notification.updateNotificationStatus(visitorId, 'approved');
  }, [emit, notification]);

  /**
   * Reject visitor access
   */
  const rejectVisitor = useCallback((visitorId, reason = 'Access denied') => {
    console.log('❌ Rejecting visitor:', visitorId);
    
    emit(SOCKET_EVENTS.VISITOR_REJECTION, {
      visitorId,
      approved: false,
      reason,
      timestamp: new Date().toISOString(),
    });

    // Update notification status locally (backend will send confirmation)
    notification.updateNotificationStatus(visitorId, 'rejected');
  }, [emit, notification]);

  const value = {
    // Connection state
    isConnected,
    connectionError,
    reconnectAttempts,
    
    // Connection methods
    connect,
    disconnect,
    
    // Device methods
    subscribeToDevice,
    unsubscribeFromDevice,
    sendDeviceCommand,
    getDeviceStatus,
    
    // Visitor methods
    approveVisitor,
    rejectVisitor,
    
    // Event methods
    on,
    off,
    emit,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * useWebSocketContext Hook
 * Access WebSocket functionality from any component
 */
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  
  return context;
};
