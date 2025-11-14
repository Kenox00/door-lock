# WebSocket Integration Guide - Admin Frontend

## Overview
This guide explains the WebSocket integration between your React admin dashboard and the Node.js backend.

## 🎯 What Was Integrated

### 1. **Core Dependencies Added**
```json
{
  "socket.io-client": "^4.6.1",  // WebSocket client library
  "react-hot-toast": "^2.4.1"    // Toast notifications
}
```

### 2. **New Hooks Created**

#### `useWebSocket` Hook (`src/hooks/useWebSocket.js`)
- **Purpose**: Manages Socket.IO connection with JWT authentication
- **Features**:
  - Auto-reconnection with exponential backoff
  - JWT token authentication
  - Event subscription/unsubscription
  - Command sending to devices
  - Connection state management

**Usage Example:**
```javascript
const {
  isConnected,
  subscribeToDevice,
  sendDeviceCommand
} = useWebSocket({
  autoConnect: true,
  handlers: {
    'device_connected': (data) => console.log('Device connected:', data),
    'new_visitor': (data) => console.log('New visitor:', data)
  }
});
```

### 3. **New Contexts Created**

#### `NotificationContext` (`src/context/NotificationContext.jsx`)
- **Purpose**: Provides toast notification system throughout the app
- **Methods**:
  - `success(message)` - Green success toast
  - `error(message)` - Red error toast  
  - `warning(message)` - Yellow warning toast
  - `info(message)` - Blue info toast
  - `deviceConnected(name, type)` - Device online notification
  - `deviceDisconnected(name, type)` - Device offline notification
  - `newVisitor(name)` - New visitor alert
  - `visitorProcessed(name, action)` - Visitor processed (approved/denied)
  - `commandStatus(device, command, status)` - Command feedback
  - `systemAlert(message, severity)` - System alerts
  - `motionDetected(device, time)` - Motion sensor alert
  - `doorStateChanged(device, isLocked)` - Door lock/unlock

**Usage Example:**
```javascript
const notification = useNotification();

// Show success
notification.success('Device updated successfully');

// Show new visitor
notification.newVisitor('John Doe');

// Show command status
notification.commandStatus('Front Door', 'unlock', 'success', 'Door unlocked');
```

#### `WebSocketContext` (`src/context/WebSocketContext.jsx`)
- **Purpose**: Central WebSocket connection manager with event routing
- **Features**:
  - Automatic device subscription on connection
  - Real-time event handling for all backend events
  - Optimistic UI updates
  - Integration with DevicesContext and NotificationContext
  - Command queueing and status tracking

**Events Handled:**
- `device_connected` - Device comes online
- `device_disconnected` - Device goes offline
- `device_status` - Device status update (door lock state, motion, etc.)
- `new_visitor` - Camera detects new visitor
- `visitor_processed` - Visitor approved/denied
- `command_status` - Command execution feedback
- `system_alert` - System-wide alerts

**Usage Example:**
```javascript
const { 
  isConnected, 
  sendDeviceCommand,
  subscribeToDevice 
} = useWebSocketContext();

// Send command to device
sendDeviceCommand(deviceId, 'unlock', { duration: 5000 });

// Subscribe to specific device
subscribeToDevice(deviceId);
```

### 4. **Updated Components**

#### `App.jsx`
Added provider hierarchy:
```javascript
<AuthProvider>
  <DevicesProvider>
    <NotificationProvider>      {/* Toast notifications */}
      <WebSocketProvider>        {/* WebSocket connection */}
        <AppRoutes />
      </WebSocketProvider>
    </NotificationProvider>
  </DevicesProvider>
</AuthProvider>
```

#### `Topbar.jsx`
- Removed old WebSocket hook usage
- Added `ConnectionStatus` component showing real-time connection state

#### `ConnectionStatus.jsx` (New Component)
Visual indicator showing:
- 🟢 **Connected** - Green with pulse animation
- 🟡 **Reconnecting** - Yellow with attempt count
- 🔴 **Disconnected** - Red when offline
- ⚪ **Connecting** - Gray when initializing

#### Device Cards (Updated)
All device cards now use WebSocket commands instead of HTTP:

**DoorLockCard.jsx:**
```javascript
// Old (HTTP)
await lockDoor(deviceId);

// New (WebSocket)
sendDeviceCommand(deviceId, 'lock');
```

**LightCard.jsx:**
```javascript
// Old (HTTP)
await turnOn(deviceId);
await setBrightness(deviceId, 75);

// New (WebSocket)
sendDeviceCommand(deviceId, 'turn_on');
sendDeviceCommand(deviceId, 'set_brightness', { brightness: 75 });
```

**PlugCard.jsx:**
```javascript
// Old (HTTP)
await turnOff(deviceId);

// New (WebSocket)
sendDeviceCommand(deviceId, 'turn_off');
```

### 5. **Updated DevicesContext**
- ✅ Removed HTTP polling (30-second interval)
- ✅ Added `refreshDevices()` alias for WebSocket context
- ✅ Kept HTTP methods for initial load and fallback
- ✅ `updateDeviceState()` now updates from WebSocket events

## 🔌 How It Works

### Connection Flow

1. **User logs in** → `AuthContext` stores JWT token
2. **App mounts** → `WebSocketProvider` initializes
3. **WebSocket connects** with JWT authentication:
   ```javascript
   io(serverUrl, {
     auth: {
       token: getToken(),        // JWT from localStorage
       clientType: 'dashboard'    // Identifies as admin dashboard
     }
   })
   ```
4. **Backend validates** token and creates connection
5. **Auto-subscribe** to all user's devices
6. **Receive events** and update UI in real-time

### Event Flow Example: Door Unlock

```
1. User clicks "Unlock" button
   ↓
2. DoorLockCard calls: sendDeviceCommand(deviceId, 'unlock')
   ↓
3. WebSocketProvider emits: 'send_command' event
   ↓
4. Backend receives command → validates → sends to device
   ↓
5. Backend emits: 'command_status' with status='pending'
   ↓
6. Frontend shows toast: "Command sent..."
   ↓
7. Device unlocks and reports back
   ↓
8. Backend emits: 'command_status' with status='success'
   ↓
9. Frontend updates UI + shows toast: "Door unlocked"
   ↓
10. Backend emits: 'device_status' with lockState='unlocked'
    ↓
11. DevicesContext updates device state
    ↓
12. UI reflects new lock state
```

### Real-Time Notifications

**New Visitor Detected:**
```
ESP32-CAM detects face
  ↓
Backend emits 'new_visitor' event
  ↓
WebSocketProvider handles event
  ↓
Shows purple toast: "🚪 New visitor: John Doe"
  ↓
Refreshes devices to show visitor log
```

**Device Goes Offline:**
```
Device loses connection
  ↓
Backend emits 'device_disconnected'
  ↓
DevicesContext updates status to 'offline'
  ↓
Shows red toast: "📷 Front Camera went offline"
  ↓
UI shows gray status indicator
```

## 📡 Available WebSocket Events

### Client → Server (Emit)

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe_device` | `{ deviceId }` | Subscribe to device updates |
| `unsubscribe_device` | `{ deviceId }` | Unsubscribe from device |
| `send_command` | `{ deviceId, command, payload }` | Send command to device |
| `request_device_status` | `{ deviceId }` | Request current device status |

### Server → Client (Listen)

| Event | Data | Notification |
|-------|------|--------------|
| `device_connected` | `{ deviceId, deviceName, deviceType, connectionType }` | Green toast: "Device is now online" |
| `device_disconnected` | `{ deviceId, deviceName, deviceType, reason }` | Red toast: "Device went offline" |
| `device_status` | `{ deviceId, status: { lockState, isOn, brightness, ... } }` | Updates UI state |
| `new_visitor` | `{ deviceId, visitor: { name, confidence, image }, timestamp }` | Purple toast: "New visitor: [name]" |
| `visitor_processed` | `{ deviceId, visitor, action, timestamp }` | Green/Red toast: "Door unlocked/denied" |
| `command_status` | `{ deviceId, commandId, command, status, message }` | Toast with command result |
| `system_alert` | `{ message, severity, deviceId }` | Toast based on severity |

## 🎨 Toast Notification Styles

All toasts match your admin theme:

- **Success** (Green): `#10B981` - Device connected, command success
- **Error** (Red): `#EF4444` - Device offline, command failed
- **Warning** (Yellow): `#F59E0B` - System warnings
- **Info** (Blue): `#3B82F6` - General information
- **Visitor** (Purple): `#8B5CF6` - New visitors, motion detected

**Toast Position:** Top-right corner
**Duration:** 3-5 seconds (configurable per type)
**Animation:** Slide in from right, fade out

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
cd admin
npm install
```

This installs:
- `socket.io-client@^4.6.1`
- `react-hot-toast@^2.4.1`

### 2. Environment Variables
Ensure `.env` file has:
```env
VITE_API_URL=http://localhost:3000/api
```

The WebSocket will connect to the same origin (removes `/api` path).

### 3. Start Backend
```bash
cd doorlock-backend
npm start
```

Backend must be running on port 3000.

### 4. Start Frontend
```bash
cd admin
npm run dev
```

Frontend runs on port 5173.

### 5. Login
Use existing credentials. The JWT token will be used for WebSocket authentication.

## 🧪 Testing the Integration

### Test 1: Connection Status
1. Open admin dashboard
2. Check top-right corner - should show green "Connected" badge
3. Stop backend server - badge turns red "Disconnected"
4. Start backend - badge turns yellow "Reconnecting..." then green

### Test 2: Real-Time Device Status
1. Open dashboard with device list
2. From another client/MQTT tool, change device status
3. Watch UI update in real-time without refresh
4. Toast notification appears

### Test 3: Command Execution
1. Click "Unlock" button on door lock
2. See toast: "Command sent..."
3. Within 2 seconds: "Front Door: Door unlocked"
4. Door lock icon changes to unlocked state

### Test 4: New Visitor Alert
1. ESP32-CAM detects face
2. Purple toast appears: "🚪 New visitor: [name]"
3. Visitor log auto-refreshes
4. New entry appears in logs

### Test 5: Device Online/Offline
1. Disconnect a device (unplug ESP32)
2. Toast appears: "📷 Camera went offline"
3. Device card shows gray status indicator
4. Reconnect device
5. Toast appears: "📷 Camera is now online"
6. Device card shows green status

## 🐛 Debugging

### Check WebSocket Connection
Open browser console:
```javascript
// Should see:
🔌 Connecting to WebSocket: http://localhost:3000
✅ WebSocket connected: [socket-id]
📡 Subscribing to 5 devices...
✅ Subscribed to device: [device-id]
```

### Check Event Reception
In `WebSocketContext.jsx`, all events are logged:
```javascript
📡 Device connected: { deviceId, deviceName, ... }
📡 New visitor detected: { visitor, timestamp, ... }
📡 Command status: { command, status, message, ... }
```

### Common Issues

**❌ "Cannot connect to WebSocket: No authentication token"**
- Solution: User not logged in. Login first to get JWT token.

**❌ "Authentication failed - token may be invalid"**
- Solution: Token expired. Logout and login again.

**❌ "Cannot subscribe: Socket not connected"**
- Solution: Wait for connection. Check backend is running.

**❌ Notifications not showing**
- Solution: Check `NotificationProvider` is in component tree above usage.

**❌ Device state not updating**
- Solution: Check device is subscribed. Open console and look for "✅ Subscribed to device" logs.

## 📊 Performance Considerations

### Optimizations Included

1. **Debounced Updates**: Brightness slider only sends command on release, not every change
2. **Optimistic Updates**: UI updates immediately before server confirms
3. **Event Batching**: Multiple status updates merged before re-render
4. **Auto-Unsubscribe**: Devices unsubscribed when component unmounts
5. **Reconnection Backoff**: Exponential delay prevents server overload

### Resource Usage

- **WebSocket Connection**: 1 persistent connection (very lightweight)
- **Old HTTP Polling**: Removed (30-second interval × N devices)
- **Toast Notifications**: Auto-dismiss after 3-5 seconds
- **Event Handlers**: Cleaned up on unmount

**Before (HTTP polling):**
```
1 request every 30 seconds × 10 devices = 20 requests/minute
```

**After (WebSocket):**
```
1 persistent connection + events only when something changes
```

## 🎓 Next Steps

### Recommended Enhancements

1. **Notification Settings**
   - Allow users to mute certain notification types
   - Configure notification duration
   - Sound alerts for critical events

2. **Offline Queue**
   - Queue commands when disconnected
   - Send when reconnected
   - Show "Queued" status

3. **Event History**
   - Display recent events in sidebar
   - Filter by event type
   - Export event logs

4. **Device Groups**
   - Subscribe to groups instead of individual devices
   - Send commands to multiple devices
   - Group status indicators

5. **Advanced Monitoring**
   - Connection quality indicator
   - Event latency display
   - Reconnection statistics

## 📚 Reference Documentation

- Backend WebSocket docs: `doorlock-backend/WEBSOCKET_REFACTOR.md`
- Backend quickstart: `doorlock-backend/QUICKSTART.md`
- Socket.IO docs: https://socket.io/docs/v4/
- React Hot Toast: https://react-hot-toast.com/

## ✅ Summary

Your admin dashboard now has:
- ✅ Real-time WebSocket connection with JWT authentication
- ✅ Automatic reconnection with exponential backoff
- ✅ Toast notifications for all device events
- ✅ Live connection status indicator
- ✅ WebSocket-based device commands (replaced HTTP)
- ✅ Optimistic UI updates for instant feedback
- ✅ Event-driven state management (replaced polling)
- ✅ Auto-subscription to all user devices
- ✅ Comprehensive error handling

**Before:** HTTP polling every 30 seconds, no real-time updates, no notifications

**After:** Instant real-time updates, push notifications, bidirectional communication, better UX

---

**Created:** 2024
**Author:** GitHub Copilot
**Version:** 1.0
