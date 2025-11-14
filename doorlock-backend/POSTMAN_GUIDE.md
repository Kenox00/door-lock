# 🚪 Smart IoT Door Lock System - Postman Testing Guide

> Complete step-by-step guide to test all backend endpoints in Postman.

---

## 📖 Table of Contents

- [Endpoint Overview](#endpoint-overview)
- [Postman Testing Guide](#postman-testing-guide)
- [Testing Flow](#testing-flow)
- [MQTT + ESP32 Integration Check](#mqtt--esp32-integration-check)
- [Final Debug Step](#final-debug-step)

---

## 1. Endpoint Overview

### Authentication Routes (`authRoutes.js`)
1. **POST /api/auth/register** - Register new admin user
2. **POST /api/auth/login** - Login and get JWT token
3. **GET /api/auth/profile** - Get current user profile
4. **PUT /api/auth/updatePassword** - Update user password
5. **POST /api/auth/logout** - Logout user

### Door Routes (`doorRoutes.js`)
6. **POST /api/door/upload** - Upload visitor photo
7. **GET /api/door/logs** - Get all visitor logs
8. **GET /api/door/stats** - Get visitor statistics
9. **DELETE /api/door/logs/:id** - Delete a visitor log

### Command Routes (`commandRoutes.js`)
10. **POST /api/command/open** - Grant access (open door)
11. **POST /api/command/deny** - Deny access
12. **GET /api/command/history** - Get command history

### Device Routes (`deviceRoutes.js`)
13. **POST /api/device/register** - Register ESP32 device
14. **GET /api/device** - List all devices
15. **PUT /api/device/:id** - Update device
16. **DELETE /api/device/:id** - Delete device
17. **POST /api/device/heartbeat** - Device heartbeat
18. **GET /api/device/status** - Get device statuses
19. **GET /api/device/logs** - Get device logs

### General Routes (`index.js`)
20. **GET /api/health** - Health check

---

## 2. Postman Testing Guide

### Authentication Routes

#### 1. POST {{baseURL}}/api/auth/register
- **Headers**: `Content-Type: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
- **Expected Response (201)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "user": {
        "username": "admin",
        "role": "admin"
      }
    }
  }
  ```
- **Notes**: Run once to create a user. If user exists, returns 400.

#### 2. POST {{baseURL}}/api/auth/login
- **Headers**: `Content-Type: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "jwt_token_here",
      "user": {
        "username": "admin",
        "role": "admin"
      }
    }
  }
  ```
- **Notes**: Save token in Postman environment: Add to **Tests** tab: `pm.environment.set("token", pm.response.json().data.token);`.

#### 3. GET {{baseURL}}/api/auth/profile
- **Headers**: `Authorization: Bearer {{token}}`
- **Request Body**: None
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Profile retrieved",
    "data": {
      "user": {
        "username": "admin",
        "role": "admin"
      }
    }
  }
  ```
- **Notes**: Requires token.

#### 4. PUT {{baseURL}}/api/auth/updatePassword
- **Headers**: `Authorization: Bearer {{token}}`, `Content-Type: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "currentPassword": "password123",
    "newPassword": "newpassword123"
  }
  ```
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Password updated successfully"
  }
  ```
- **Notes**: Requires token. Update password for future logins.

#### 5. POST {{baseURL}}/api/auth/logout
- **Headers**: `Authorization: Bearer {{token}}`
- **Request Body**: None
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```
- **Notes**: Client-side only; clears token in Postman.

### Door Routes

#### 6. POST {{baseURL}}/api/door/upload
- **Headers**: `Content-Type: multipart/form-data`
- **Request Body**: Key: `image` (File) - select a sample JPEG image; Key: `deviceId` (Text) - e.g., `"67456789abcdef1234567890"`
- **Expected Response (201)**:
  ```json
  {
    "success": true,
    "message": "Image uploaded successfully",
    "data": {
      "log": {
        "imageUrl": "cloudinary_url",
        "status": "pending",
        "timestamp": "2023-..."
      }
    }
  }
  ```
- **Notes**: Triggers Socket.IO `new_visitor` event. Check server logs for Cloudinary upload. Requires `deviceId` from registered device.

#### 7. GET {{baseURL}}/api/door/logs
- **Headers**: `Authorization: Bearer {{token}}`
- **Request Body**: None
- **Query Params**: Optional: `page=1&limit=10`
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "logs": [
        {
          "imageUrl": "...",
          "status": "pending",
          "timestamp": "..."
        }
      ]
    }
  }
  ```
- **Notes**: Requires token. Returns array of logs.

#### 8. GET {{baseURL}}/api/door/stats
- **Headers**: `Authorization: Bearer {{token}}`
- **Request Body**: None
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "totalVisitors": 5,
      "granted": 3,
      "denied": 2
    }
  }
  ```
- **Notes**: Requires token.

#### 9. DELETE {{baseURL}}/api/door/logs/:id
- **Headers**: `Authorization: Bearer {{token}}`
- **URL Params**: Replace `:id` with a log ID from `/api/door/logs` (e.g., `1234567890abcdef`)
- **Request Body**: None
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Log deleted successfully"
  }
  ```
- **Notes**: Requires token. Deletes from DB and Cloudinary.

### Command Routes

#### 10. POST {{baseURL}}/api/command/open
- **Headers**: `Authorization: Bearer {{token}}`, `Content-Type: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "logId": "visitor_log_id_here"  // From /api/door/logs
  }
  ```
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Door opened successfully",
    "data": {
      "command": "open",
      "timestamp": "..."
    }
  }
  ```
- **Notes**: Requires token. Publishes MQTT to ESP32.

#### 11. POST {{baseURL}}/api/command/deny
- **Headers**: `Authorization: Bearer {{token}}`, `Content-Type: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "logId": "visitor_log_id_here"
  }
  ```
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Access denied",
    "data": {
      "command": "deny",
      "timestamp": "..."
    }
  }
  ```
- **Notes**: Requires token. Publishes MQTT to ESP32.

#### 12. GET {{baseURL}}/api/command/history
- **Headers**: `Authorization: Bearer {{token}}`
- **Request Body**: None
- **Query Params**: Optional: `page=1&limit=10`
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "commands": [
        {
          "command": "open",
          "timestamp": "..."
        }
      ]
    }
  }
  ```
- **Notes**: Requires token.

### Device Routes

#### 13. POST {{baseURL}}/api/device/register
- **Headers**: `Authorization: Bearer {{token}}`, `Content-Type: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "name": "ESP32-Door-1",
    "espId": "esp32_12345"
  }
  ```
- **Expected Response (201)**:
  ```json
  {
    "success": true,
    "message": "Device registered",
    "data": {
      "device": {
        "name": "ESP32-Door-1",
        "status": "offline"
      }
    }
  }
  ```
- **Notes**: Requires token.

#### 14. GET {{baseURL}}/api/device
- **Headers**: `Authorization: Bearer {{token}}`
- **Request Body**: None
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "devices": [
        {
          "name": "ESP32-Door-1",
          "status": "offline"
        }
      ]
    }
  }
  ```
- **Notes**: Requires token.

#### 15. PUT {{baseURL}}/api/device/:id
- **Headers**: `Authorization: Bearer {{token}}`, `Content-Type: application/json`
- **URL Params**: Replace `:id` with device ID (e.g., `1234567890abcdef`)
- **Request Body (JSON)**:
  ```json
  {
    "name": "Updated ESP32",
    "status": "online"
  }
  ```
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Device updated",
    "data": {
      "device": {
        "name": "Updated ESP32"
      }
    }
  }
  ```
- **Notes**: Requires token.

#### 16. DELETE {{baseURL}}/api/device/:id
- **Headers**: `Authorization: Bearer {{token}}`
- **URL Params**: Replace `:id` with device ID
- **Request Body**: None
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Device deleted"
  }
  ```
- **Notes**: Requires token.

#### 17. POST {{baseURL}}/api/device/heartbeat
- **Headers**: `Content-Type: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "espId": "esp32_12345"
  }
  ```
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Heartbeat received",
    "data": {
      "status": "online"
    }
  }
  ```
- **Notes**: Simulates ESP32 heartbeat. Updates device status.

#### 18. GET {{baseURL}}/api/device/status
- **Headers**: `Authorization: Bearer {{token}}`
- **Request Body**: None
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "statuses": [
        {
          "espId": "esp32_12345",
          "status": "online"
        }
      ]
    }
  }
  ```
- **Notes**: Requires token.

#### 19. GET {{baseURL}}/api/device/logs
- **Headers**: `Authorization: Bearer {{token}}`
- **Request Body**: None
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "logs": [
        {
          "espId": "esp32_12345",
          "action": "heartbeat",
          "timestamp": "..."
        }
      ]
    }
  }
  ```
- **Notes**: Requires token.

### General Routes

#### 20. GET {{baseURL}}/api/health
- **Headers**: None
- **Request Body**: None
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Server is healthy",
    "data": {
      "uptime": 123,
      "timestamp": "..."
    }
  }
  ```
- **Notes**: Quick check if server is running.

---

## 3. Testing Flow

Follow this order to avoid dependency issues (e.g., needing a token or existing data). Use Postman's **Runner** to automate the collection if desired.

1. **Start with Health Check**: Test `/api/health` to ensure the server is up.
2. **User Setup**: Register (`/api/auth/register`) → Login (`/api/auth/login`) → Save token.
3. **Profile/Auth Tests**: Test `/api/auth/profile`, `/api/auth/updatePassword`, `/api/auth/logout`.
4. **Device Setup**: Register a device (`/api/device/register`) → Test device CRUD (`/api/device`, PUT/DELETE).
5. **Door Flow**: Upload a photo (`/api/door/upload`) → Check logs (`/api/door/logs`) → View stats (`/api/door/stats`) → Delete a log if needed.
6. **Command Flow**: Use a log ID from Step 5 → Open door (`/api/command/open`) → Check history (`/api/command/history`) → Deny another if applicable.
7. **Device Monitoring**: Send heartbeat (`/api/device/heartbeat`) → Check status (`/api/device/status`) → View logs (`/api/device/logs`).

**Token Management**: After login, the token is saved. For protected routes, it auto-fills. If expired (401 error), re-login.

---

## 4. MQTT + ESP32 Integration Check

To test MQTT interaction, use `/api/command/open` (or `/api/command/deny`). This publishes to MQTT topic `/door/lock/control` with payload like `{"command": "open", "logId": "..."}`.

- **Test Case**: After uploading a photo and getting a log ID, call `/api/command/open` with that ID.
- **Expected Console Logs** (in your backend terminal):
  - `📤 Publishing to /door/lock/control (QoS: 1, Retain: false)`
  - `✅ MQTT Published to /door/lock/control: {"command":"open","logId":"..."}`
  - If ESP32 responds: `📨 MQTT Message received on /door/lock/response: {"status":"opened","espId":"..."}`
- **Verification**: Check your HiveMQ Cloud dashboard or ESP32 logs for the message. If no response, ensure ESP32 is subscribed to `/door/lock/control` and publishing to `/door/lock/response`.
- **Failure Signs**: No publish logs → Check MQTT connection in `test-mqtt.js`. Silent failures → Verify broker URL and credentials in `.env`.

---

## 5. Final Debug Step

- **Response Verification**: Always check status codes (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Error). Match against expected JSON. Use Postman's **Console** for raw responses.
- **Error Handling**: Test invalid inputs (e.g., wrong password → 401; missing token → 401; invalid JSON → 400). Check `message` field for details.
- **Postman Tips**:
  - **Collection Runner**: Run all tests in sequence.
  - **Environments**: Use variables for reusability (e.g., `{{token}}`, `{{logId}}`).
  - **Tests Tab**: Add assertions like `pm.test("Status code is 200", () => pm.response.code === 200);` to automate checks.
  - **Import Collection**: Use the `postman_collection.json` in your project for pre-built requests.
- **Common Issues**: 500 errors → Check server logs. Connection timeouts → Verify `.env` and network. MQTT failures → Run `test-mqtt.js` separately.

If you encounter issues, share the error logs or responses, and I can help debug further! This should get you fully tested. 🚀