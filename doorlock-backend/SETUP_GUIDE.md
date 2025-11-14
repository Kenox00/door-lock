# 🚀 Quick Start Guide - Door Lock Backend

## Prerequisites Installation

### 1. Install Node.js
Download and install Node.js v16+ from https://nodejs.org/

Verify installation:
```bash
node --version
npm --version
```

### 2. Install MongoDB

**Option A: Local Installation**
- Windows: Download from https://www.mongodb.com/try/download/community
- Start MongoDB service

**Option B: MongoDB Atlas (Recommended)**
1. Create free account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Get connection string
4. Whitelist your IP address

### 3. Setup Cloudinary
1. Create free account at https://cloudinary.com
2. Go to Dashboard
3. Copy: Cloud Name, API Key, API Secret

### 4. MQTT Broker

**Option A: Use Public Broker (Development)**
- HiveMQ: `mqtt://broker.hivemq.com:1883` (already in .env.example)

**Option B: Local Mosquitto (Production)**
```bash
# Install Mosquitto
# Windows: Download from https://mosquitto.org/download/
# Run: mosquitto -v
```

## 📦 Installation Steps

### Step 1: Navigate to Project
```bash
cd doorlock-backend
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install all required packages:
- express
- mongoose
- socket.io
- mqtt
- cloudinary
- bcrypt
- jsonwebtoken
- multer
- helmet
- cors
- winston
- And development dependencies

### Step 3: Configure Environment

Create `.env` file:
```bash
# Copy the example file
cp .env.example .env

# On Windows PowerShell:
Copy-Item .env.example .env
```

Edit `.env` file with your credentials:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB - Use YOUR connection string
MONGO_URI=mongodb://localhost:27017/doorlock-db
# OR for Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/doorlock-db

# JWT - Change this to a random secure string
JWT_SECRET=your-super-secret-jwt-key-CHANGE-THIS-IN-PRODUCTION
JWT_EXPIRATION=7d

# MQTT
MQTT_BROKER_URL=mqtt://broker.hivemq.com:1883
MQTT_CLIENT_ID=doorlock-backend
MQTT_USERNAME=
MQTT_PASSWORD=

# Cloudinary - Use YOUR credentials
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS - Add your frontend URLs
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 4: Start the Server

**Development Mode (with auto-reload)**
```bash
npm run dev
```

**Production Mode**
```bash
npm start
```

You should see:
```
[INFO]: 🚀 Starting Door Lock Backend Server...
[INFO]: MongoDB Connected: cluster.mongodb.net
[INFO]: Cloudinary configured successfully
[INFO]: MQTT Client Connected
[INFO]: ✅ MQTT Client initialized
[INFO]: Socket.IO initialized
[INFO]: ✅ Server running on port 5000 in development mode
[INFO]: 📡 API available at http://localhost:5000/api
[INFO]: 🔗 Health check: http://localhost:5000/api/health
```

### Step 5: Test the API

Open browser or Postman and visit:
```
http://localhost:5000/api/health
```

You should see:
```json
{
  "success": true,
  "message": "Door Lock API is running",
  "timestamp": "2025-11-13T...",
  "uptime": 12.345
}
```

## 🧪 Testing the Complete Flow

### 1. Register Admin User

**Endpoint:** `POST http://localhost:5000/api/auth/register`

**Body (JSON):**
```json
{
  "username": "admin",
  "email": "admin@doorlock.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "username": "admin",
      "email": "admin@doorlock.com",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save the token!** You'll need it for authenticated requests.

### 2. Register a Device

**Endpoint:** `POST http://localhost:5000/api/device/register`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Front Door Lock",
  "espId": "ESP32_001",
  "location": "Main Entrance",
  "firmwareVersion": "1.0.0"
}
```

### 3. Upload Visitor Photo (Simulating DoorApp)

**Endpoint:** `POST http://localhost:5000/api/door/upload`

**Headers:**
```
Content-Type: multipart/form-data
```

**Body (form-data):**
- Key: `image` (File) - Select an image file
- Key: `deviceId` (Text) - Use the device ID from step 2

**Response:**
```json
{
  "success": true,
  "message": "Visitor photo uploaded successfully",
  "data": {
    "visitorLogId": "...",
    "imageUrl": "https://res.cloudinary.com/...",
    "deviceName": "Front Door Lock",
    "status": "pending"
  }
}
```

### 4. Get Pending Visitors (AdminApp)

**Endpoint:** `GET http://localhost:5000/api/door/logs/pending`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

### 5. Grant Access (Open Door)

**Endpoint:** `POST http://localhost:5000/api/command/open`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Body:**
```json
{
  "visitorLogId": "VISITOR_LOG_ID_FROM_STEP_3",
  "notes": "Authorized visitor"
}
```

This will:
- Update visitor log status to "granted"
- Send MQTT message to ESP32
- Emit Socket.IO event to DoorApp

### 6. View All Logs

**Endpoint:** `GET http://localhost:5000/api/door/logs?page=1&limit=20`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

## 🔌 Testing Real-Time Features

### Socket.IO Client Test (Browser Console)

```javascript
// Connect to Socket.IO server
const socket = io('http://localhost:5000', {
  transports: ['websocket']
});

// Identify as admin
socket.emit('identify', { clientType: 'admin' });

// Listen for new visitors
socket.on('new_visitor', (data) => {
  console.log('New visitor:', data);
});

// Listen for door decisions
socket.on('door_decision', (data) => {
  console.log('Door decision:', data);
});

// Listen for device status
socket.on('device_status', (data) => {
  console.log('Device status:', data);
});
```

### MQTT Client Test (ESP32 Simulation)

Using MQTT.fx or Mosquitto client:

**Subscribe to:**
- Topic: `/door/lock/control`

**Publish to:**
- Topic: `/door/lock/status`
- Payload:
```json
{
  "espId": "ESP32_001",
  "status": "online",
  "metadata": {
    "freeHeap": 45000
  }
}
```

## 📊 Monitoring

### View Logs
Logs are stored in `logs/` folder:
- `combined.log` - All logs
- `error.log` - Errors only

### Check Statistics

**Device Stats:**
```
GET http://localhost:5000/api/device/stats
```

**Visitor Stats:**
```
GET http://localhost:5000/api/door/stats
```

## ⚠️ Troubleshooting

### MongoDB Connection Failed
- Check if MongoDB is running
- Verify connection string in `.env`
- Check network connectivity for Atlas

### MQTT Not Connecting
- Verify broker URL
- Check firewall settings
- Try public broker first

### Cloudinary Upload Failed
- Verify API credentials
- Check account quota
- Ensure image file is valid

### Port Already in Use
```bash
# Change PORT in .env file
PORT=5001
```

## 🎯 Next Steps

1. ✅ Backend is running
2. Build ESP32 firmware to subscribe to MQTT topics
3. Build AdminApp (React/Next.js) to manage visitors
4. Build DoorApp (React Native/Flutter) to capture photos
5. Implement additional features (face recognition, logs export, etc.)

## 📚 Additional Resources

- API Documentation: See `README.md`
- Code Comments: Every file has detailed comments
- Example Requests: See Postman collection below

---

**🎉 Congratulations! Your backend is ready for production!**
