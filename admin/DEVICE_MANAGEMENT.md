# Device Management System - Admin Panel

## Overview
The admin panel now includes a complete device management system that allows administrators to add, view, and manage ESP32 IoT devices.

## Features Implemented

### 1. Add Device Modal
- **Location**: `src/components/devices/AddDeviceModal.jsx`
- **Features**:
  - Form to register new ESP32 devices
  - Fields: Device Name, ESP ID, Device Type, Location, Firmware Version
  - Auto-generates secure device token
  - Displays credentials after successful registration
  - Copy-to-clipboard functionality for all credentials
  - Form validation

### 2. Device Credentials Component
- **Location**: `src/components/devices/DeviceCredentials.jsx`
- **Features**:
  - Display device ID, ESP ID, and other details
  - Copy credentials to clipboard
  - Status indicator
  - Device metadata display

### 3. Device Details Page
- **Location**: `src/pages/Devices/DeviceDetails.jsx`
- **Route**: `/devices/:id`
- **Features**:
  - Full device information display
  - Device credentials section
  - Quick actions (Restart, Settings, Update Firmware)
  - Device statistics
  - Back navigation to devices list

### 4. Enhanced Devices Context
- **Location**: `src/context/DevicesContext.jsx`
- **New Method**: `addDevice(deviceData)`
- Automatically refreshes device list after adding new device

### 5. Updated Devices Overview
- **Location**: `src/pages/Devices/DevicesOverview.jsx`
- **Features**:
  - "Add Device" button in header
  - Opens AddDeviceModal on click
  - Auto-refreshes device list after adding device
  - "Details" button on device cards

## How to Use

### Adding a New Device

1. Navigate to **Devices** page
2. Click the **"Add Device"** button in the top right
3. Fill in the form:
   - **Device Name**: Friendly name (e.g., "Front Door Lock")
   - **ESP32 ID**: Unique identifier (e.g., "ESP32-001")
   - **Device Type**: Select from dropdown (Door Lock, Camera, Motion Sensor, Other)
   - **Location**: Optional (e.g., "Main Entrance")
   - **Firmware Version**: Optional (defaults to "1.0.0")
4. Click **"Add Device"**
5. **Save the credentials** displayed:
   - **Device ID**: MongoDB ID for the device
   - **ESP ID**: The unique ESP32 identifier
   - **Device Token**: Security token (IMPORTANT: Save this - it won't be shown again!)

### Viewing Device Details

1. From the Devices page, click the **"Details"** button on any device card
2. View complete device information including:
   - Device credentials
   - Current status
   - Location and firmware version
   - Last seen timestamp
3. Use quick actions to manage the device

## Backend API Integration

### Register Device Endpoint
```
POST /api/device/register
Authorization: Bearer <token>

Request Body:
{
  "name": "Front Door Lock",
  "espId": "ESP32-001",
  "deviceType": "door-lock",
  "location": "Main Entrance",
  "firmwareVersion": "1.0.0"
}

Response:
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Front Door Lock",
    "espId": "ESP32-001",
    "deviceType": "door-lock",
    "deviceToken": "a1b2c3d4e5f6...64-character-token",
    "location": "Main Entrance",
    "status": "online",
    "createdAt": "2025-11-17T10:30:00.000Z"
  },
  "message": "Device registered successfully"
}
```

### Get Device Details Endpoint
```
GET /api/device/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Front Door Lock",
    "espId": "ESP32-001",
    "deviceType": "door-lock",
    "location": "Main Entrance",
    "status": "online",
    "firmwareVersion": "1.0.0",
    "lastSeen": "2025-11-17T12:00:00.000Z",
    "metadata": {
      "rssi": -45
    }
  }
}
```

## ESP32 Device Configuration

After adding a device in the admin panel, configure your ESP32 with the provided credentials:

```cpp
// ESP32 Configuration
const char* DEVICE_ID = "507f1f77bcf86cd799439011";
const char* ESP_ID = "ESP32-001";
const char* DEVICE_TOKEN = "a1b2c3d4e5f6..."; // 64-character token
const char* SERVER_URL = "http://your-server.com:5000";

// Use these credentials to:
// 1. Authenticate with the backend
// 2. Connect to MQTT broker
// 3. Send heartbeat signals
// 4. Receive commands from dashboard
```

## Security Notes

1. **Device Token**: 
   - Generated automatically (64-character hex string)
   - Used for device authentication
   - **Never exposed in GET requests**
   - Only shown once during device creation
   - Store securely on ESP32 device

2. **ESP ID**:
   - Must be unique across all devices
   - Automatically converted to uppercase
   - Used as device identifier in MQTT topics

3. **Authentication**:
   - Admin must be logged in to add devices
   - Devices are associated with the creating user
   - Bearer token required for all API calls

## File Structure

```
admin/src/
├── components/
│   └── devices/
│       ├── AddDeviceModal.jsx         (New)
│       ├── DeviceCredentials.jsx      (New)
│       ├── DoorLockCard.jsx          (Updated)
│       ├── LightCard.jsx
│       ├── MotionCard.jsx
│       └── PlugCard.jsx
├── pages/
│   └── Devices/
│       ├── DevicesOverview.jsx       (Updated)
│       └── DeviceDetails.jsx         (New)
├── context/
│   └── DevicesContext.jsx            (Updated)
└── routes/
    └── AppRoutes.jsx                 (Updated)
```

## Future Enhancements

- [ ] Edit device details
- [ ] Delete device with confirmation
- [ ] Device firmware update via OTA
- [ ] Device sharing with other users
- [ ] Device activity history
- [ ] Regenerate device token
- [ ] Bulk device operations
- [ ] Device templates for quick setup
- [ ] QR code generation for device credentials
- [ ] Export device configuration

## Troubleshooting

### Device Not Appearing After Creation
- Check browser console for errors
- Verify backend API is running
- Ensure authentication token is valid
- Check network requests in DevTools

### Device Token Lost
- Device tokens cannot be retrieved after creation
- Options:
  1. Use the existing device with saved token
  2. Delete and recreate the device
  3. Contact administrator for token regeneration feature

### WebSocket Connection Issues
- Verify backend WebSocket server is running
- Check device credentials in ESP32 code
- Ensure firewall allows WebSocket connections
- Check MQTT broker connectivity

## Related Documentation

- [Backend API Documentation](../../doorlock-backend/README.md)
- [Device Context API](../src/context/DevicesContext.jsx)
- [WebSocket Integration](../src/context/WebSocketContext.jsx)
