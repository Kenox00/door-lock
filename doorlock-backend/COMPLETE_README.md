# 🚪 Smart IoT Door Lock System - Backend API

> **Production-ready backend built with Node.js, Express, MongoDB, MQTT, and Socket.IO**

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0-green.svg)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.6-black.svg)](https://socket.io/)
[![MQTT](https://img.shields.io/badge/MQTT-5.3-purple.svg)](https://mqtt.org/)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Real-time Communication](#real-time-communication)
- [MQTT Integration](#mqtt-integration)
- [Security](#security)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This backend powers a complete Smart IoT Door Lock System that allows:
- **Visitors** to ring the doorbell and have their photo captured
- **DoorApp** to capture and upload visitor photos in real-time
- **AdminApp** to receive instant notifications and grant/deny access
- **ESP32 Devices** to receive OPEN/CLOSE commands via MQTT
- **Cloud Storage** for all visitor photos
- **Complete Audit Trail** of all visitor attempts and admin decisions

### System Components

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  DoorApp    │◄────►│   Backend   │◄────►│  AdminApp   │
│  (Mobile)   │      │   Server    │      │   (Web)     │
└─────────────┘      └──────┬──────┘      └─────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
              ┌─────▼─────┐   ┌────▼─────┐
              │  MongoDB  │   │  ESP32   │
              │  Database │   │  Device  │
              └───────────┘   └──────────┘
                    │
              ┌─────▼─────┐
              │Cloudinary │
              │  Storage  │
              └───────────┘
```

---

## ✨ Features

### Core Functionality
- ✅ JWT-based authentication for admin users
- ✅ Real-time visitor notifications via Socket.IO
- ✅ MQTT communication with ESP32 devices
- ✅ Cloud image storage with Cloudinary
- ✅ Complete visitor logging and history
- ✅ Device management and monitoring
- ✅ Admin decision tracking

### Security Features
- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Rate limiting on all endpoints
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation and sanitization
- ✅ File upload restrictions

### Developer Features
- ✅ Clean, modular architecture
- ✅ Comprehensive error handling
- ✅ Winston logging system
- ✅ Graceful shutdown handling
- ✅ Environment-based configuration
- ✅ API documentation
- ✅ Postman collection included

---

## 🏗️ Architecture

### Project Structure

```
doorlock-backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.js      # MongoDB connection
│   │   ├── mqtt.js          # MQTT client setup
│   │   ├── socket.js        # Socket.IO configuration
│   │   └── cloudinary.js    # Cloudinary setup
│   ├── models/              # Mongoose schemas
│   │   ├── User.js          # Admin user model
│   │   ├── VisitorLog.js    # Visitor entry model
│   │   └── Device.js        # ESP32 device model
│   ├── routes/              # Express routes
│   ├── controllers/         # Business logic
│   ├── middlewares/         # Express middlewares
│   ├── services/            # External service integrations
│   ├── utils/               # Helper functions
│   └── index.js             # Main server file
├── uploads/                 # Temporary file storage
├── logs/                    # Application logs
├── .env.example             # Environment template
├── package.json             # Dependencies
└── README.md                # This file
```

### Technology Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| Runtime | Node.js 16+ | JavaScript runtime |
| Framework | Express.js | Web application framework |
| Database | MongoDB | Document database |
| ODM | Mongoose | MongoDB object modeling |
| Auth | JWT | Token-based authentication |
| Real-time | Socket.IO | WebSocket communication |
| IoT | MQTT | Device messaging protocol |
| Storage | Cloudinary | Cloud image storage |
| Upload | Multer | File upload handling |
| Security | Helmet, bcrypt | Security middleware |
| Logging | Winston | Application logging |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v16 or higher
- **MongoDB** (local or Atlas)
- **Cloudinary** account
- **MQTT Broker** (HiveMQ public or local)

### Installation

1. **Clone and navigate to the project**
   ```bash
   cd doorlock-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env with your credentials
   ```

4. **Run pre-flight check**
   ```bash
   npm run check
   ```

5. **Start the server**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Verify it's running**
   ```
   Visit: http://localhost:5000/api/health
   ```

### Environment Configuration

Edit `.env` file with your credentials:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/doorlock-db
# OR for Atlas: mongodb+srv://username:password@cluster.mongodb.net/doorlock-db

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRATION=7d

# MQTT
MQTT_BROKER_URL=mqtt://broker.hivemq.com:1883
MQTT_CLIENT_ID=doorlock-backend

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Endpoints Overview

#### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register new admin user | No |
| POST | `/login` | Login and get JWT token | No |
| GET | `/me` | Get current user profile | Yes |
| PUT | `/password` | Update password | Yes |
| POST | `/logout` | Logout (clear client token) | Yes |

#### Door Operations (`/api/door`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/upload` | Upload visitor photo | No* |
| GET | `/logs` | Get all visitor logs | Yes |
| GET | `/logs/pending` | Get pending requests | Yes |
| GET | `/logs/:id` | Get specific log | Yes |
| GET | `/stats` | Get statistics | Yes |

*Can be secured with API key if needed

#### Commands (`/api/command`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/open` | Grant access (open door) | Yes |
| POST | `/deny` | Deny access | Yes |
| GET | `/history` | Get decision history | Yes |

#### Devices (`/api/device`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register ESP32 device | Yes |
| GET | `/` | List all devices | Yes |
| GET | `/stats` | Get device statistics | Yes |
| GET | `/:id` | Get device details | Yes |
| PUT | `/:id` | Update device | Yes |
| POST | `/:id/heartbeat` | Device heartbeat | No* |
| DELETE | `/:id` | Delete device | Yes |

### Example Requests

#### 1. Register Admin
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@doorlock.com",
  "password": "securepassword123"
}
```

#### 2. Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "securepassword123"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGc..."
  }
}
```

#### 3. Upload Visitor Photo
```bash
POST /api/door/upload
Content-Type: multipart/form-data

FormData:
- image: [file]
- deviceId: "6543210abcdef"
```

#### 4. Grant Access
```bash
POST /api/command/open
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "visitorLogId": "6543210abcdef",
  "notes": "Authorized visitor"
}
```

---

## 🔄 Real-time Communication

### Socket.IO Events

The server uses Socket.IO for real-time notifications between AdminApp and DoorApp.

#### Client Connection

```javascript
const socket = io('http://localhost:5000');

// Identify client type
socket.emit('identify', { clientType: 'admin' }); // or 'door'
```

#### Server Events

**`new_visitor`** - Sent to AdminApp when visitor photo is uploaded
```javascript
socket.on('new_visitor', (data) => {
  // data: { visitorId, imageUrl, deviceId, deviceName, timestamp }
});
```

**`door_decision`** - Sent to DoorApp when admin makes decision
```javascript
socket.on('door_decision', (data) => {
  // data: { visitorId, decision, adminUsername, timestamp }
});
```

**`device_status`** - Sent to all clients when device status changes
```javascript
socket.on('device_status', (data) => {
  // data: { deviceId, deviceName, status, lastSeen }
});
```

---

## 📡 MQTT Integration

### MQTT Topics

| Topic | Direction | Purpose |
|-------|-----------|---------|
| `/door/lock/control` | Publish | Send commands to ESP32 |
| `/door/lock/response` | Subscribe | Receive ESP32 responses |
| `/door/lock/status` | Subscribe | Device status updates |

### Message Formats

**Control Message (OPEN)**
```json
{
  "command": "OPEN",
  "deviceId": "ESP32_001",
  "timestamp": "2025-11-13T10:30:00Z"
}
```

**Control Message (DENY)**
```json
{
  "command": "DENY",
  "deviceId": "ESP32_001",
  "timestamp": "2025-11-13T10:30:00Z"
}
```

**Status Message (from ESP32)**
```json
{
  "espId": "ESP32_001",
  "status": "online",
  "metadata": {
    "freeHeap": 45000,
    "chipModel": "ESP32-WROOM-32"
  }
}
```

### ESP32 Example Code

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* mqtt_server = "broker.hivemq.com";
const char* topic_control = "/door/lock/control";
const char* topic_status = "/door/lock/status";

void callback(char* topic, byte* payload, unsigned int length) {
  // Parse JSON and execute command
  if (strcmp(topic, topic_control) == 0) {
    // Open or close door based on command
  }
}
```

---

## 🔒 Security

### Implemented Security Measures

1. **Authentication**
   - JWT tokens with expiration
   - Bcrypt password hashing (10 rounds)
   - Token refresh mechanism

2. **Rate Limiting**
   - Auth endpoints: 5 requests per 15 minutes
   - Upload endpoints: 10 requests per minute
   - General API: 100 requests per 15 minutes

3. **Input Validation**
   - All inputs sanitized
   - File type validation
   - File size limits (5MB)
   - ObjectId validation

4. **Headers & CORS**
   - Helmet security headers
   - Configured CORS whitelist
   - Content Security Policy

5. **Error Handling**
   - No sensitive data in errors
   - Generic error messages
   - Detailed logging for debugging

### Security Best Practices

```javascript
// Always use HTTPS in production
// Set strong JWT secret (32+ characters)
// Whitelist specific origins in CORS
// Use MongoDB Atlas with IP whitelist
// Enable firewall rules
// Regular dependency updates
// Environment variable protection
```

---

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use MongoDB Atlas or secured MongoDB
- [ ] Use HTTPS/TLS
- [ ] Set strong JWT_SECRET
- [ ] Configure CORS for production domains
- [ ] Use secured MQTT broker (mqtts://)
- [ ] Enable MongoDB authentication
- [ ] Set up monitoring and alerts
- [ ] Configure log rotation
- [ ] Use process manager (PM2)

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start src/index.js --name doorlock-backend

# Save configuration
pm2 save

# Set up auto-restart on boot
pm2 startup
```

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

---

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Check if MongoDB is running
mongod --version

# Verify connection string in .env
# For Atlas, check IP whitelist
```

**MQTT Not Connecting**
```bash
# Test broker connectivity
mqtt pub -h broker.hivemq.com -t test -m "hello"

# Check firewall settings
# Verify broker URL in .env
```

**Cloudinary Upload Failed**
```bash
# Verify credentials in .env
# Check Cloudinary dashboard for quota
# Ensure file is valid image format
```

**Port Already in Use**
```bash
# Change port in .env
PORT=5001

# Or kill process on port 5000
# Windows: netstat -ano | findstr :5000
# Linux/Mac: lsof -i :5000
```

### Debug Mode

Enable verbose logging:
```bash
# Set in .env
NODE_ENV=development

# View logs
tail -f logs/combined.log
```

---

## 📝 Additional Resources

- **Setup Guide**: See `SETUP_GUIDE.md` for detailed setup instructions
- **Project Summary**: See `PROJECT_SUMMARY.md` for architecture overview
- **Postman Collection**: Import `postman_collection.json` for API testing
- **Code Documentation**: All files contain detailed inline comments

---

## 🤝 Contributing

This is a production template. Feel free to customize for your needs:
- Add authentication methods (OAuth, etc.)
- Implement face recognition
- Add email/SMS notifications
- Create admin dashboard
- Add analytics and reporting

---

## 📄 License

ISC

---

## 👥 Support

For issues and questions:
1. Check code comments in source files
2. Review `SETUP_GUIDE.md`
3. Check `logs/` directory for errors
4. Verify all environment variables are set

---

**Built with ❤️ for IoT Smart Door Lock Systems**

*Production-ready • Secure • Scalable • Well-documented*
