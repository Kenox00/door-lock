import { createContext, useContext, useState, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const NotificationContext = createContext(null);

/**
 * Custom toast styles matching admin theme
 */
const toastStyles = {
  success: {
    duration: 4000,
    style: {
      background: '#10B981',
      color: '#fff',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10B981',
    },
  },
  error: {
    duration: 5000,
    style: {
      background: '#EF4444',
      color: '#fff',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#EF4444',
    },
  },
  warning: {
    duration: 4000,
    style: {
      background: '#F59E0B',
      color: '#fff',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#F59E0B',
    },
  },
  info: {
    duration: 3000,
    style: {
      background: '#3B82F6',
      color: '#fff',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#3B82F6',
    },
  },
};

/**
 * NotificationProvider Component
 * Provides toast notification functionality throughout the app
 */
export const NotificationProvider = ({ children }) => {
  // State for storing visitor notifications
  const [visitorNotifications, setVisitorNotifications] = useState([]);

  /**
   * Add a new visitor notification
   */
  const addVisitorNotification = useCallback((visitor) => {
    const notification = {
      id: visitor.visitorId || visitor._id || Date.now().toString(),
      visitorId: visitor.visitorId || visitor._id,
      imageUrl: visitor.imageUrl,
      deviceId: visitor.deviceId,
      deviceName: visitor.deviceName || 'Door Camera',
      timestamp: visitor.timestamp || new Date().toISOString(),
      status: visitor.status || 'pending',
      message: `New visitor at ${visitor.deviceName || 'Door Camera'}`,
      read: false,
    };

    setVisitorNotifications(prev => [notification, ...prev]);
    return notification;
  }, []);

  /**
   * Mark notification as read
   */
  const markNotificationAsRead = useCallback((notificationId) => {
    setVisitorNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  /**
   * Update notification status (approved/rejected)
   */
  const updateNotificationStatus = useCallback((notificationId, status) => {
    setVisitorNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, status, read: true } : n)
    );
  }, []);

  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(() => {
    setVisitorNotifications([]);
  }, []);

  /**
   * Get unread notification count
   */
  const unreadCount = visitorNotifications.filter(n => !n.read).length;

  /**
   * Show success notification
   */
  const success = (message, options = {}) => {
    toast.success(message, { ...toastStyles.success, ...options });
  };

  /**
   * Show error notification
   */
  const error = (message, options = {}) => {
    toast.error(message, { ...toastStyles.error, ...options });
  };

  /**
   * Show warning notification
   */
  const warning = (message, options = {}) => {
    toast(message, { 
      ...toastStyles.warning, 
      ...options,
      icon: '⚠️',
    });
  };

  /**
   * Show info notification
   */
  const info = (message, options = {}) => {
    toast(message, { 
      ...toastStyles.info, 
      ...options,
      icon: 'ℹ️',
    });
  };

  /**
   * Show device connected notification
   */
  const deviceConnected = (deviceName, deviceType) => {
    const icon = getDeviceIcon(deviceType);
    toast.success(
      `${icon} ${deviceName} is now online`,
      { ...toastStyles.success, duration: 3000 }
    );
  };

  /**
   * Show device disconnected notification
   */
  const deviceDisconnected = (deviceName, deviceType) => {
    const icon = getDeviceIcon(deviceType);
    toast.error(
      `${icon} ${deviceName} went offline`,
      { ...toastStyles.error, duration: 4000 }
    );
  };

  /**
   * Show new visitor notification
   */
  const newVisitor = (visitorName) => {
    toast(
      `🚪 New visitor: ${visitorName || 'Unknown'}`,
      {
        style: {
          background: '#8B5CF6',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
        duration: 5000,
        icon: '📷',
      }
    );
  };

  /**
   * Show visitor processed notification
   */
  const visitorProcessed = (visitorName, action) => {
    const actionText = action === 'approved' ? 'Door unlocked' : 'Access denied';
    const bgColor = action === 'approved' ? '#10B981' : '#EF4444';
    
    toast(
      `${actionText} for ${visitorName || 'visitor'}`,
      {
        style: {
          background: bgColor,
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
        duration: 4000,
        icon: action === 'approved' ? '✅' : '❌',
      }
    );
  };

  /**
   * Show command status notification
   */
  const commandStatus = (deviceName, command, status, message) => {
    if (status === 'success' || status === 'completed') {
      toast.success(
        `${deviceName}: ${message || 'Command completed'}`,
        { ...toastStyles.success, duration: 3000 }
      );
    } else if (status === 'failed' || status === 'error') {
      toast.error(
        `${deviceName}: ${message || 'Command failed'}`,
        { ...toastStyles.error, duration: 4000 }
      );
    } else if (status === 'pending') {
      toast(
        `${deviceName}: Command sent...`,
        {
          ...toastStyles.info,
          duration: 2000,
          icon: '⏳',
        }
      );
    }
  };

  /**
   * Show system alert notification
   */
  const systemAlert = (message, severity = 'info') => {
    const severityMap = {
      info: () => info(message),
      warning: () => warning(message),
      error: () => error(message),
      critical: () => toast.error(message, {
        ...toastStyles.error,
        duration: 10000,
        icon: '🚨',
      }),
    };

    (severityMap[severity] || severityMap.info)();
  };

  /**
   * Show motion detected notification
   */
  const motionDetected = (deviceName) => {
    toast(
      `🏃 Motion detected by ${deviceName}`,
      {
        style: {
          background: '#8B5CF6',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
        duration: 3000,
      }
    );
  };

  /**
   * Show door state change notification
   */
  const doorStateChanged = (deviceName, isLocked) => {
    const message = isLocked ? 'locked' : 'unlocked';
    const icon = isLocked ? '🔒' : '🔓';
    
    toast(
      `${icon} ${deviceName} is now ${message}`,
      {
        style: {
          background: isLocked ? '#3B82F6' : '#10B981',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
        duration: 3000,
      }
    );
  };

  /**
   * Dismiss all toasts
   */
  const dismissAll = () => {
    toast.dismiss();
  };

  const value = {
    success,
    error,
    warning,
    info,
    deviceConnected,
    deviceDisconnected,
    newVisitor,
    visitorProcessed,
    commandStatus,
    systemAlert,
    motionDetected,
    doorStateChanged,
    dismissAll,
    // Visitor notification management
    visitorNotifications,
    addVisitorNotification,
    markNotificationAsRead,
    updateNotificationStatus,
    clearAllNotifications,
    unreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toaster 
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          className: '',
          duration: 4000,
        }}
      />
    </NotificationContext.Provider>
  );
};

/**
 * useNotification Hook
 * Access notification functions from any component
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  
  return context;
};

/**
 * Helper: Get device icon emoji based on type
 */
const getDeviceIcon = (deviceType) => {
  const icons = {
    camera: '📷',
    door_lock: '🔒',
    light: '💡',
    motion_sensor: '👁️',
    smart_plug: '🔌',
    temperature_sensor: '🌡️',
    smoke_detector: '🔥',
  };
  
  return icons[deviceType] || '📱';
};
