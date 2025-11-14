# ⚡ Quick Start Guide - WebSocket Refactor

## 🚀 Setup (5 Minutes)

### 1. Install Dependencies
```bash
cd doorlock-backend
npm install
```

### 2. Environment Variables
Ensure `.env` has:
```bash
MONGODB_URI=mongodb://localhost:27017/doorlock
JWT_SECRET=your-super-secret-key-min-64-chars
JWT_EXPIRATION=7d
MQTT_BROKER_URL=mqtts://your-hivemq-cloud.com
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Migrate Database
```bash
node migrate-devices.js
```

Expected output:
```
✅ Connected to MongoDB
📋 Found admin user: admin (admin@example.com)
📊 Found 3 devices without userId
  ✓ Migrated device: Front Door (ESP32-001)
  ✓ Migrated device: Back Door (ESP32-002)
  ✓ Migrated device: Garage (ESP32-003)
✅ Successfully migrated 3 devices
✨ Migration complete!
```

### 4. Start Backend
```bash
npm run dev
```

### 5. Test Health Endpoint
```bash
curl http://localhost:3000/api/health
```

Expected:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 5
  }
}
```

✅ **Backend is ready!**

---

## 🔧 Frontend Integration (10 Minutes)

### Update Socket.IO Connection

**Before:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  socket.emit('identify', { clientType: 'admin' });
});
```

**After:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('token'), // User JWT
    clientType: 'dashboard'
  }
});

socket.on('connect', () => {
  console.log('✅ Connected with authentication');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
  // Redirect to login if token invalid
  if (error.message === 'Invalid token') {
    window.location.href = '/login';
  }
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Server forcibly disconnected - likely auth issue
    socket.connect(); // Try to reconnect
  }
});
```

### Listen to New Events

```javascript
// Device status updates
socket.on('device_connected', (data) => {
  console.log(`Device ${data.deviceName} is now online`);
  // Update UI
});

socket.on('device_disconnected', (data) => {
  console.log(`Device ${data.deviceName} is offline: ${data.reason}`);
  // Update UI
});

// New visitor notification
socket.on('new_visitor', (data) => {
  console.log('New visitor!', data);
  // Show notification
  // Display image: data.imageUrl
});

// Command acknowledgment
socket.on('command_status', (data) => {
  console.log(`Command ${data.commandId}: ${data.status}`);
  if (data.status === 'executed') {
    showSuccess('Door unlocked!');
  } else if (data.status === 'failed') {
    showError(`Failed: ${data.errorMessage}`);
  }
});

// System alerts (low battery, errors, etc.)
socket.on('system_alert', (data) => {
  if (data.level === 'warning') {
    showWarning(data.message);
  } else {
    showError(data.message);
  }
});
```

### Send Commands via Socket.IO (Optional - can still use HTTP)

```javascript
// Subscribe to specific device updates
socket.emit('subscribe_device', { deviceId: 'abc123' });

socket.on('subscribed', (data) => {
  console.log(`Subscribed to device ${data.deviceId}`);
});

// Send command
socket.emit('send_command', {
  deviceId: 'abc123',
  command: 'unlock_door',
  payload: { duration: 5000 }
});

socket.on('command_sent', (data) => {
  console.log(`Command sent: ${data.commandId}`);
});

socket.on('error', (data) => {
  console.error('Socket error:', data.message);
});
```

---

## 🤖 ESP32 Integration (30 Minutes)

### 1. Register Device (One-Time Setup)

Run this HTTP request from Postman or cURL:

```bash
curl -X POST http://localhost:3000/api/device/register \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Front Door",
    "espId": "ESP32-001",
    "deviceType": "door-lock",
    "location": "Main Entrance",
    "firmwareVersion": "1.0.0"
  }'
```

**Response (SAVE THIS):**
```json
{
  "success": true,
  "data": {
    "id": "674b1234567890abcdef1234",
    "name": "Front Door",
    "espId": "ESP32-001",
    "deviceToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",  // ⚠️ SAVE THIS!
    "deviceType": "door-lock",
    "status": "online",
    "createdAt": "2025-11-14T10:00:00.000Z"
  }
}
```

### 2. Store Token in ESP32

```cpp
#include <Preferences.h>

Preferences preferences;

void setup() {
  preferences.begin("doorlock", false);
  
  // Save device credentials (only once)
  preferences.putString("deviceId", "674b1234567890abcdef1234");
  preferences.putString("deviceToken", "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6");
  preferences.putString("espId", "ESP32-001");
  
  preferences.end();
}
```

### 3. Connect to WebSocket

```cpp
#include <WiFi.h>
#include <SocketIOclient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

SocketIOclient socketIO;
Preferences preferences;

String deviceId;
String deviceToken;
String espId;

void setup() {
  Serial.begin(115200);
  
  // Load credentials
  preferences.begin("doorlock", true);
  deviceId = preferences.getString("deviceId");
  deviceToken = preferences.getString("deviceToken");
  espId = preferences.getString("espId");
  preferences.end();
  
  // Connect WiFi
  WiFi.begin("YOUR_SSID", "YOUR_PASSWORD");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");
  
  // Connect Socket.IO with authentication
  socketIO.begin("api.example.com", 3000, "/socket.io/");
  
  // Send auth payload
  DynamicJsonDocument authDoc(256);
  authDoc["token"] = deviceToken;
  authDoc["clientType"] = "device";
  authDoc["deviceId"] = deviceId;
  
  String authPayload;
  serializeJson(authDoc, authPayload);
  socketIO.sendEVENT(authPayload);
  
  // Set up event handlers
  socketIO.onEvent(socketIOEvent);
  
  Serial.println("✅ Socket.IO configured");
}

void socketIOEvent(socketIOmessageType_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case sIOtype_CONNECT:
      Serial.println("✅ Socket.IO connected!");
      sendHeartbeat();
      break;
      
    case sIOtype_DISCONNECT:
      Serial.println("❌ Socket.IO disconnected!");
      break;
      
    case sIOtype_EVENT:
      handleSocketEvent(payload, length);
      break;
  }
}

void handleSocketEvent(uint8_t * payload, size_t length) {
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, payload);
  
  String event = doc[0];
  JsonObject data = doc[1];
  
  if (event == "unlock_door") {
    handleUnlockCommand(data);
  } else if (event == "lock_door") {
    handleLockCommand(data);
  } else if (event == "request_snapshot") {
    handleSnapshotCommand(data);
  } else if (event == "update_settings") {
    handleSettingsCommand(data);
  } else if (event == "restart_device") {
    handleRestartCommand(data);
  }
}

void handleUnlockCommand(JsonObject data) {
  String commandId = data["commandId"];
  int duration = data["duration"] | 5000; // Default 5 seconds
  
  Serial.printf("🔓 Unlocking door for %dms (Command: %s)\n", duration, commandId.c_str());
  
  // Execute unlock
  digitalWrite(RELAY_PIN, HIGH);
  delay(duration);
  digitalWrite(RELAY_PIN, LOW);
  
  // Send acknowledgment
  sendCommandAck(commandId, "executed", "");
}

void handleLockCommand(JsonObject data) {
  String commandId = data["commandId"];
  
  Serial.printf("🔒 Locking door (Command: %s)\n", commandId.c_str());
  
  // Execute lock
  digitalWrite(RELAY_PIN, LOW);
  
  // Send acknowledgment
  sendCommandAck(commandId, "executed", "");
}

void sendCommandAck(String commandId, String status, String errorMessage) {
  DynamicJsonDocument doc(256);
  doc[0] = "command_ack";
  
  JsonObject data = doc.createNestedObject(1);
  data["commandId"] = commandId;
  data["deviceId"] = deviceId;
  data["status"] = status; // "received", "executing", "executed", "failed"
  data["timestamp"] = millis();
  
  if (errorMessage.length() > 0) {
    data["errorMessage"] = errorMessage;
  }
  
  String payload;
  serializeJson(doc, payload);
  socketIO.sendEVENT(payload);
  
  Serial.printf("✅ Sent acknowledgment: %s -> %s\n", commandId.c_str(), status.c_str());
}

void sendHeartbeat() {
  DynamicJsonDocument doc(256);
  doc[0] = "device_heartbeat";
  
  JsonObject data = doc.createNestedObject(1);
  data["deviceId"] = deviceId;
  data["batteryLevel"] = 85; // Replace with actual battery reading
  data["status"] = "online";
  
  String payload;
  serializeJson(doc, payload);
  socketIO.sendEVENT(payload);
  
  Serial.println("💓 Sent heartbeat");
}

void loop() {
  socketIO.loop();
  
  // Send heartbeat every 30 seconds
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 30000) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
}
```

### 4. Test Connection

1. Upload code to ESP32
2. Open Serial Monitor
3. Should see:
```
✅ WiFi connected
✅ Socket.IO configured
✅ Socket.IO connected!
💓 Sent heartbeat
```

4. Check backend logs:
```
Client connected: xyz123 - User: ESP32-001, Type: device
Device 674b1234567890abcdef1234 connected via WebSocket
```

5. Check dashboard - device should show as "online"

---

## 🧪 Testing

### Test 1: Health Check
```bash
curl http://localhost:3000/api/health
```

### Test 2: Authenticated Health
```bash
TOKEN="your_jwt_token"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/health/detailed
```

### Test 3: Get User's Devices
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/device
```

### Test 4: Send Command
```bash
curl -X POST http://localhost:3000/api/command/open \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "visitorLogId": "visitor_log_id_here",
    "notes": "Test unlock"
  }'
```

### Test 5: Check Device Events
```bash
# MongoDB shell
db.deviceevents.find({ deviceId: ObjectId("your_device_id") }).sort({ timestamp: -1 }).limit(10)
```

---

## 🐛 Troubleshooting

### Socket.IO Won't Connect

**Check 1: Token Valid?**
```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log(decoded); // Should show userId, username, etc.
```

**Check 2: CORS Settings**
In `src/config/socket.js`:
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', // Add your frontend URL
  'http://localhost:3001'
];
```

**Check 3: Network Tab**
Open browser DevTools → Network → WS → Should see successful upgrade to WebSocket

### Device Not Showing as Online

**Check 1: Connection Manager**
```javascript
// In backend console
const deviceConnectionManager = require('./src/services/deviceConnectionManager');
console.log(deviceConnectionManager.getAllConnectedDevices());
```

**Check 2: Database**
```javascript
db.devices.findOne({ espId: "ESP32-001" }, { status: 1, lastSeen: 1 })
```

**Check 3: Device Logs**
ESP32 Serial Monitor should show:
```
✅ Socket.IO connected!
💓 Sent heartbeat
```

### Commands Not Working

**Check 1: Device Online?**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/device/:deviceId
```

**Check 2: User Has Permission?**
Response should include:
```json
{
  "userPermissions": ["view", "control", "admin"]
}
```

**Check 3: Device Events**
```bash
db.deviceevents.find({ 
  commandId: "your_command_id" 
}).sort({ timestamp: 1 })
```

Should show:
1. `command_sent`
2. `command_executed` (or `command_failed`)

---

## 📚 Further Reading

- **Complete Documentation:** `WEBSOCKET_REFACTOR.md` (15,000 words)
- **API Reference:** `POSTMAN_GUIDE.md`
- **Setup Guide:** `SETUP_GUIDE.md`
- **Project Summary:** `REFACTOR_SUMMARY.md`

---

## ✅ Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Database migrated (`node migrate-devices.js`)
- [ ] Backend running (`npm run dev`)
- [ ] Health endpoint working
- [ ] Frontend updated with new Socket.IO auth
- [ ] ESP32 registered and has deviceToken
- [ ] ESP32 connecting with WebSocket
- [ ] Commands working end-to-end
- [ ] DeviceEvents being logged
- [ ] Multi-tenancy working (user sees only their devices)

---

## 🎉 Done!

Your WebSocket system is now production-ready with:
- ✅ Authentication
- ✅ Multi-tenancy
- ✅ Command acknowledgment
- ✅ Event sourcing
- ✅ Health monitoring

**Questions?** Review the detailed documentation or check the troubleshooting section above.

**Need help?** All code has inline comments explaining the logic.

🚀 **Happy coding!**
