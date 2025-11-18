# IoT Onboarding - Quick Integration Guide

## ✅ Camera App Status: READY FOR INTEGRATION

All required features have been implemented. The camera app can now:
- Accept QR code onboarding
- Authenticate with backend
- Stream frames at controlled FPS
- Respond to admin commands
- Persist credentials across reloads

---

## 🚀 Quick Start for Backend Team

### 1. Required API Endpoints

Implement these three endpoints in your backend:

```typescript
POST /api/device/activate
Request: { deviceId, token, type, room }
Response: { success: true, jwt: "token" }

POST /api/device/validate  
Request: { deviceId, token }
Response: { success: true, valid: true }

POST /api/device/register
Request: { deviceName, type, room }
Response: { deviceId, token, qrCode: "data:image/png..." }
```

### 2. WebSocket Event Handlers

Listen for these events from cameras:

```typescript
// Device connects
socket.on('handshake', (data) => {
  // data: { type, deviceId, token, deviceType, metadata }
  // Authenticate and register device
});

// Keep-alive (every 30s)
socket.on('heartbeat', (data) => {
  // data: { deviceId, timestamp, token, status }
  // Update last seen timestamp
});

// Streaming frames (when recording)
socket.on('frame', (data) => {
  // data: { deviceId, image, timestamp, fps }
  // Forward to admin dashboard
});
```

### 3. Commands to Send to Cameras

```typescript
// Start live streaming
socket.emit('backend-command', {
  command: 'start_stream',
  deviceId: 'xxx',
  timestamp: Date.now()
});

// Stop streaming
socket.emit('backend-command', {
  command: 'stop_stream',
  deviceId: 'xxx',
  timestamp: Date.now()
});

// Restart camera app
socket.emit('backend-command', {
  command: 'restart_camera',
  deviceId: 'xxx',
  timestamp: Date.now()
});
```

---

## 📱 QR Code Format

Generate QR codes with this URL format:

```
https://your-app.com/device/connect?deviceId=xxx&token=yyy&type=camera&room=Entrance
```

**Parameters:**
- `deviceId` - Unique device identifier (MongoDB ID or UUID)
- `token` - Device-specific authentication token
- `type` - Device type (must be "camera")
- `room` - Location name (e.g., "Front Door", "Back Entrance")

---

## 🔧 What Was Changed

### Files Created:
- `src/hooks/useQROnboarding.ts` - QR onboarding logic
- `src/pages/DeviceConnect.tsx` - Activation UI
- `IOT_ONBOARDING_AUDIT_REPORT.md` - Full documentation

### Files Modified:
- `src/store/sessionStore.ts` - Added QR fields + persistence
- `src/lib/apiService.ts` - Added activation/validation APIs
- `src/hooks/useWebSocket.ts` - Added handshake + heartbeat
- `src/components/CameraView.tsx` - Added streaming (12 FPS)
- `src/hooks/useCamera.ts` - Mobile support + freeze detection
- `src/App.jsx` - Added `/device/connect` route

---

## 🧪 Testing the Flow

### 1. Test QR Onboarding
```bash
# Open in browser:
http://localhost:5173/device/connect?deviceId=test123&token=abc&type=camera&room=TestRoom

# Expected behavior:
# 1. Shows "Activating Device" screen
# 2. Calls POST /api/device/activate
# 3. Stores credentials in localStorage
# 4. Redirects to home screen
# 5. Camera connects via WebSocket
```

### 2. Test WebSocket Connection
Check browser console for:
```
🔌 Initializing WebSocket connection...
✅ WebSocket connected
🤝 Handshake sent to backend
💓 Heartbeat sent (every 30s)
```

### 3. Test Streaming
Send command from backend:
```javascript
socket.emit('backend-command', {
  command: 'start_stream',
  deviceId: 'test123',
  timestamp: Date.now()
});

// Camera will emit 'frame' events at 12 FPS
```

---

## 📊 Performance Specs

- **Streaming FPS:** 12 frames per second (configurable)
- **Heartbeat Interval:** 30 seconds
- **Frame Format:** JPEG (base64)
- **Compression Quality:** 80%
- **Mobile Resolution:** 1280x720
- **Desktop Resolution:** 1920x1080

---

## ⚠️ Backend TODO Checklist

- [ ] Implement `/api/device/activate` endpoint
- [ ] Implement `/api/device/validate` endpoint
- [ ] Implement `/api/device/register` endpoint
- [ ] Add WebSocket `handshake` handler
- [ ] Add WebSocket `heartbeat` handler
- [ ] Add WebSocket `frame` handler
- [ ] Store devices in database
- [ ] Generate QR codes on device creation
- [ ] Track device online/offline status

---

## 📞 Support

For questions or issues:
1. Review `IOT_ONBOARDING_AUDIT_REPORT.md` for detailed documentation
2. Check browser console for debug logs
3. Test API endpoints with Postman/Insomnia
4. Verify WebSocket connection in Network tab

---

**Last Updated:** November 17, 2025  
**Camera App Version:** 1.0.0 (QR Onboarding Ready)
