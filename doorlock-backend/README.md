# Smart IoT Door Lock System - Backend

Production-ready backend for a Smart IoT Door Lock System built with Node.js, Express, MongoDB, MQTT, and Socket.IO.

## 📋 Features

- **User Authentication**: JWT-based authentication for admin users
- **Real-time Communication**: Socket.IO for live notifications to AdminApp and DoorApp
- **IoT Device Management**: MQTT protocol for ESP32 device communication
- **Cloud Storage**: Cloudinary integration for visitor photo storage
- **RESTful API**: Complete CRUD operations for devices, visitors, and commands
- **Security**: Helmet, CORS, rate limiting, and bcrypt password hashing
- **Logging**: Winston-based structured logging
- **Error Handling**: Centralized error handling with detailed error responses
- **Scalability**: Connection pooling, pagination, and optimized queries

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **Real-time**: Socket.IO
- **IoT Protocol**: MQTT
- **Cloud Storage**: Cloudinary
- **Security**: Helmet, bcrypt, CORS
- **Logging**: Winston
- **File Upload**: Multer

## 📁 Project Structure

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
│   │   ├── Device.js        # ESP32 device model
│   │   └── index.js         # Model exports
│   ├── routes/              # Express routes
│   │   ├── authRoutes.js    # Authentication routes
│   │   ├── doorRoutes.js    # Door/visitor routes
│   │   ├── commandRoutes.js # Command routes
│   │   ├── deviceRoutes.js  # Device routes
│   │   └── index.js         # Route aggregator
│   ├── controllers/         # Route controllers
│   │   ├── authController.js
│   │   ├── doorController.js
│   │   ├── commandController.js
│   │   └── deviceController.js
│   ├── middlewares/         # Express middlewares
│   │   ├── auth.js          # JWT authentication
│   │   ├── errorHandler.js  # Error handling
│   │   ├── upload.js        # File upload (Multer)
│   │   └── rateLimiter.js   # Rate limiting
│   ├── services/            # Business logic services
│   │   ├── cloudinaryService.js
│   │   ├── mqttService.js
│   │   └── socketService.js
│   ├── utils/               # Utility functions
│   │   ├── jwt.js           # JWT helpers
│   │   ├── logger.js        # Winston logger
│   │   ├── response.js      # Response formatters
│   │   └── validators.js    # Input validators
│   └── index.js             # Main server file
├── uploads/                 # Temporary file uploads
├── logs/                    # Application logs
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── package.json             # Dependencies
└── README.md                # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- Cloudinary account
- MQTT broker (HiveMQ or local Mosquitto)

### Installation

1. **Clone the repository**
   ```bash
   cd doorlock-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your configuration:
   - MongoDB connection string
   - JWT secret key
   - Cloudinary credentials
   - MQTT broker URL

4. **Start the server**

   Development mode (with auto-reload):
   ```bash
   npm run dev
   ```

   Production mode:
   ```bash
   npm start
   ```

5. **Verify server is running**
   
   Visit: `http://localhost:5000/api/health`

## 🔌 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new admin | No |
| POST | `/login` | Login user | No |
| GET | `/me` | Get current user | Yes |
| PUT | `/password` | Update password | Yes |
| POST | `/logout` | Logout user | Yes |

### Door Operations (`/api/door`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/upload` | Upload visitor photo | No* |
| GET | `/logs` | Get visitor logs (paginated) | Yes |
| GET | `/logs/pending` | Get pending requests | Yes |
| GET | `/logs/:id` | Get specific log | Yes |
| GET | `/stats` | Get visitor statistics | Yes |

*Can be secured with API key

### Commands (`/api/command`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/open` | Grant access (open door) | Yes |
| POST | `/deny` | Deny access | Yes |
| GET | `/history` | Get command history | Yes |

### Devices (`/api/device`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new device | Yes |
| GET | `/` | Get all devices | Yes |
| GET | `/stats` | Get device statistics | Yes |
| GET | `/:id` | Get device by ID | Yes |
| PUT | `/:id` | Update device | Yes |
| POST | `/:id/heartbeat` | Device heartbeat | No* |
| DELETE | `/:id` | Delete device | Yes |

## 🔄 Real-time Events (Socket.IO)

### Client Events (Emit)

- `identify` - Client identifies as 'admin' or 'door'

### Server Events (Listen)

- `new_visitor` - New visitor photo uploaded (to AdminApp)
- `door_decision` - Admin decision made (to DoorApp)
- `device_status` - Device online/offline status

## 📡 MQTT Topics

| Topic | Direction | Description |
|-------|-----------|-------------|
| `/door/lock/control` | Publish | Send commands to ESP32 |
| `/door/lock/response` | Subscribe | Receive responses from ESP32 |
| `/door/lock/status` | Subscribe | Device status updates |

### MQTT Message Formats

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

**Status Message**
```json
{
  "espId": "ESP32_001",
  "status": "online",
  "metadata": {
    "freeHeap": 45000,
    "chipModel": "ESP32"
  }
}
```

## 📝 Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT signing
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `MQTT_BROKER_URL` - MQTT broker URL

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt with salt rounds
- **Rate Limiting**: Prevent brute-force attacks
- **CORS**: Configured allowed origins
- **Helmet**: Security headers
- **Input Validation**: Sanitize and validate all inputs
- **Error Handling**: Never expose sensitive data in errors

## 📊 Logging

Logs are written to:
- Console (colored, formatted)
- `logs/error.log` (errors only)
- `logs/combined.log` (all logs)

## 🧪 Testing with Postman

1. Import the collection (create one or use the API endpoints above)
2. Set up environment variables (BASE_URL, TOKEN)
3. Start with `/api/auth/register` to create an admin user
4. Login to get JWT token
5. Use token in Authorization header for protected routes

## 🚢 Production Deployment

1. Set `NODE_ENV=production` in environment
2. Use MongoDB Atlas for database
3. Use secured MQTT broker (mqtts://)
4. Configure proper CORS origins
5. Set strong JWT secret
6. Enable HTTPS
7. Use process manager (PM2)

### PM2 Deployment

```bash
npm install -g pm2
pm2 start src/index.js --name doorlock-backend
pm2 save
pm2 startup
```

## 🤝 Contributing

This is a production-ready template. Customize as needed for your specific requirements.

## 📄 License

ISC

## 👥 Support

For issues and questions, please refer to the code comments and documentation within each file.

---

**Built with ❤️ for IoT Door Lock Systems**
