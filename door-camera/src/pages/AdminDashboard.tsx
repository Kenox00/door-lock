import { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { EVENTS } from '../lib/websocketEvents';
import { sendCommand } from '../lib/apiService';
import type { 
  MotionDetectedPayload, 
  BellPressedPayload, 
  SnapshotPayload,
  CameraOnlinePayload 
} from '../lib/websocketEvents';

/**
 * Admin Dashboard Component
 * Receives real-time updates from camera devices via WebSocket
 */
export const AdminDashboard = () => {
  const { emitEvent, isConnected, socket } = useWebSocket();
  const [devices, setDevices] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  /**
   * Subscribe to WebSocket events from cameras
   */
  useEffect(() => {
    if (!socket) return;

    // Listen for camera online status
    socket.on(EVENTS.CAMERA_ONLINE, (data: CameraOnlinePayload) => {
      console.log('📹 Camera online:', data);
      updateDeviceStatus(data.deviceId, { online: true, lastSeen: data.timestamp });
      addNotification({
        type: 'info',
        message: `Camera ${data.deviceId} is now online`,
        timestamp: data.timestamp,
      });
    });

    // Listen for motion detection
    socket.on(EVENTS.MOTION_DETECTED, (data: MotionDetectedPayload) => {
      console.log('🚨 Motion detected:', data);
      updateDeviceStatus(data.deviceId, { motion: true, lastMotion: data.timestamp });
      addNotification({
        type: 'warning',
        message: `Motion detected on ${data.deviceId}`,
        timestamp: data.timestamp,
        snapshot: data.snapshot,
      });
      
      // Trigger live feed or alert in UI
      handleMotionAlert(data);
    });

    // Listen for bell press
    socket.on(EVENTS.BELL_PRESSED, (data: BellPressedPayload) => {
      console.log('🔔 Bell pressed:', data);
      updateDeviceStatus(data.deviceId, { bell: true, lastBell: data.timestamp });
      addNotification({
        type: 'alert',
        message: `Doorbell pressed on ${data.deviceId}`,
        timestamp: data.timestamp,
      });
      
      // Show doorbell notification in UI
      handleBellPress(data);
    });

    // Listen for snapshot uploads
    socket.on(EVENTS.SNAPSHOT, (data: SnapshotPayload) => {
      console.log('📸 Snapshot received:', data);
      updateDeviceStatus(data.deviceId, { lastSnapshot: data.timestamp });
      addNotification({
        type: 'info',
        message: `New snapshot from ${data.deviceId}`,
        timestamp: data.timestamp,
        image: data.image,
      });
    });

    // Cleanup listeners
    return () => {
      socket.off(EVENTS.CAMERA_ONLINE);
      socket.off(EVENTS.MOTION_DETECTED);
      socket.off(EVENTS.BELL_PRESSED);
      socket.off(EVENTS.SNAPSHOT);
    };
  }, [socket]);

  /**
   * Fetch initial device status on mount
   */
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        // Fetch list of devices (adjust endpoint as needed)
        // const response = await api.get('/devices');
        // setDevices(response.data);
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      }
    };

    fetchDevices();
  }, []);

  /**
   * Update device status in state
   */
  const updateDeviceStatus = (deviceId: string, updates: any) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, ...updates } : device
      )
    );
  };

  /**
   * Add notification to list
   */
  const addNotification = (notification: any) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50
  };

  /**
   * Handle motion alert - trigger live feed
   */
  const handleMotionAlert = (_data: MotionDetectedPayload) => {
    // Show live feed modal or alert
    // Play notification sound
    // Update UI with motion indicator
  };

  /**
   * Handle bell press - show notification
   */
  const handleBellPress = (_data: BellPressedPayload) => {
    // Show doorbell notification
    // Play doorbell sound
    // Trigger video call UI
  };

  /**
   * Send command to camera device
   */
  const handleSendCommand = async (deviceId: string, command: string) => {
    try {
      await sendCommand({ deviceId, command });
      console.log(`✅ Command sent to ${deviceId}: ${command}`);
    } catch (error) {
      console.error('Failed to send command:', error);
    }
  };

  /**
   * Request snapshot from camera
   */
  const handleRequestSnapshot = (deviceId: string) => {
    emitEvent(EVENTS.ADMIN_ACTION, {
      action: 'request-snapshot',
      deviceId,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="admin-dashboard p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Connection Status */}
      <div className="mb-4">
        <span className={`px-4 py-2 rounded ${isConnected ? 'bg-green-500' : 'bg-red-500'} text-white`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>

      {/* Device List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {devices.map((device) => (
          <div key={device.id} className="border rounded-lg p-4 shadow">
            <h3 className="font-semibold">{device.name}</h3>
            <p className="text-sm text-gray-600">{device.location}</p>
            <div className="mt-2">
              <span className={`px-2 py-1 rounded text-xs ${device.online ? 'bg-green-200' : 'bg-gray-200'}`}>
                {device.online ? 'Online' : 'Offline'}
              </span>
              {device.motion && <span className="ml-2 px-2 py-1 rounded text-xs bg-yellow-200">Motion</span>}
              {device.bell && <span className="ml-2 px-2 py-1 rounded text-xs bg-blue-200">Bell</span>}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleRequestSnapshot(device.id)}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              >
                Snapshot
              </button>
              <button
                onClick={() => handleSendCommand(device.id, 'start-recording')}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm"
              >
                Record
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div className="border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Recent Events</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notifications.map((notif, idx) => (
            <div key={idx} className={`p-3 rounded ${
              notif.type === 'alert' ? 'bg-red-100' : 
              notif.type === 'warning' ? 'bg-yellow-100' : 
              'bg-blue-100'
            }`}>
              <p className="font-medium">{notif.message}</p>
              <p className="text-xs text-gray-600">
                {new Date(notif.timestamp).toLocaleString()}
              </p>
              {notif.snapshot && (
                <img src={notif.snapshot} alt="Snapshot" className="mt-2 w-32 h-24 object-cover rounded" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
