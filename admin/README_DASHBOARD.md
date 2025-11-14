# Smart Home Dashboard - IoT Device Management System

A complete React-based dashboard for managing and controlling IoT smart home devices including door locks, lights, plugs, motion sensors, and cameras.

## Features

### 🏠 Dashboard Overview
- Real-time device status monitoring
- Active device tracking
- Energy consumption monitoring
- Quick access to all devices
- Recent activity feed

### 🔒 Device Management
- **Door Lock**: Lock/unlock control, camera integration, battery status
- **Smart Lights**: On/off control, brightness adjustment, energy monitoring
- **Smart Plugs**: Power control, energy usage tracking, cost estimation
- **Motion Sensors**: Real-time motion detection, activity history
- **Cameras**: Live feed streaming, snapshot capture, recording control

### 📹 Camera System
- Live video streaming from ESP32-CAM
- Multiple camera support
- Snapshot capture
- Recording control
- Fullscreen viewing

### 📊 Activity Logs
- Real-time event tracking via WebSocket
- Filterable logs by device type
- Export logs to CSV
- Detailed event information

### 🔐 Authentication
- Secure login system
- Token-based authentication
- Protected routes
- Auto-logout on token expiration

## Tech Stack

- **Frontend**: React 19
- **Styling**: Tailwind CSS v4 (Oxide)
- **Routing**: React Router v7
- **HTTP Client**: Axios
- **Real-time**: WebSocket
- **Build Tool**: Vite

## Project Structure

```
src/
├── api/                    # API integration
│   ├── axiosClient.js      # Axios configuration
│   ├── authApi.js          # Authentication endpoints
│   ├── devicesApi.js       # Device control endpoints
│   ├── cameraApi.js        # Camera endpoints
│   └── logsApi.js          # Logs endpoints
│
├── components/
│   ├── layout/             # Layout components
│   │   ├── Sidebar.jsx
│   │   ├── Topbar.jsx
│   │   └── DashboardLayout.jsx
│   │
│   ├── devices/            # Device-specific components
│   │   ├── DoorLockCard.jsx
│   │   ├── LightCard.jsx
│   │   ├── PlugCard.jsx
│   │   ├── MotionCard.jsx
│   │   └── CameraViewer.jsx
│   │
│   └── ui/                 # Reusable UI components
│       ├── Button.jsx
│       ├── Card.jsx
│       └── Switch.jsx
│
├── context/                # Global state management
│   ├── AuthContext.jsx     # Authentication state
│   └── DevicesContext.jsx  # Devices state
│
├── hooks/                  # Custom React hooks
│   ├── useAuth.js
│   ├── useDevices.js
│   └── useWebSocket.js
│
├── pages/                  # Page components
│   ├── Auth/
│   │   └── Login.jsx
│   ├── Dashboard/
│   │   └── Home.jsx
│   ├── Devices/
│   │   └── DevicesOverview.jsx
│   ├── Camera/
│   │   └── LiveFeed.jsx
│   └── Logs/
│       └── ActivityLogs.jsx
│
├── routes/
│   └── AppRoutes.jsx       # Route configuration
│
├── utils/                  # Utility functions
│   ├── storage.js          # LocalStorage helpers
│   └── format.js           # Formatting utilities
│
├── App.jsx                 # Root component
└── main.jsx                # Entry point
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your backend API URL:
   ```env
   VITE_API_URL=http://localhost:3000/api
   VITE_WS_URL=ws://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

## Backend Integration

### Required API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

#### Devices
- `GET /api/devices` - Get all devices
- `POST /api/devices/:id/on` - Turn device on
- `POST /api/devices/:id/off` - Turn device off
- `POST /api/devices/:id/brightness` - Set brightness
- `POST /api/doorlock/lock` - Lock door
- `POST /api/doorlock/unlock` - Unlock door

#### Camera
- `GET /api/camera/stream-url` - Get stream URL
- `GET /api/camera/snapshot` - Capture snapshot
- `POST /api/camera/record/start` - Start recording
- `POST /api/camera/record/stop` - Stop recording

#### Logs
- `GET /api/logs` - Get activity logs
- `GET /api/logs/export` - Export logs to CSV

#### WebSocket
- `ws://your-server/ws/events` - Real-time event stream

### WebSocket Message Format

```json
{
  "type": "device_event",
  "event": "door_lock",
  "device": "Front Door",
  "message": "Door was unlocked",
  "timestamp": "2025-11-14T10:30:00Z"
}
```

## Usage

### Login
1. Navigate to `/login`
2. Enter credentials
3. Dashboard will load automatically

### Control Devices
1. Go to **Devices** page
2. Filter by device type if needed
3. Use device cards to control:
   - Toggle switches for lights/plugs
   - Lock/unlock buttons for doors
   - Brightness sliders for lights

### View Camera Feed
1. Go to **Camera** page
2. Select camera from the list
3. Use controls to:
   - Take snapshots
   - Start/stop recording
   - View fullscreen

### Monitor Activity
1. Go to **Activity Logs** page
2. Filter logs by type
3. Export logs if needed
4. Real-time updates via WebSocket

## Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint Code
```bash
npm run lint
```

## Customization

### Adding New Device Types

1. **Create device component** in `src/components/devices/`
2. **Add device type** to filter in `DevicesOverview.jsx`
3. **Update renderDeviceCard** function
4. **Add device icon** in `utils/format.js`

### Styling

The project uses Tailwind CSS v4. Modify styles in:
- Component files using Tailwind classes
- `src/index.css` for global styles

### API Configuration

Update API endpoints in:
- `.env` for base URL
- `src/api/` files for specific endpoints

## Security

- JWT token stored in localStorage
- Auto-logout on token expiration
- Protected routes
- HTTPS recommended for production
- WebSocket authentication via token

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### WebSocket connection fails
- Check `VITE_WS_URL` in `.env`
- Ensure backend WebSocket server is running
- Check CORS configuration

### API calls fail
- Verify `VITE_API_URL` in `.env`
- Check backend server is running
- Inspect network tab for errors

### Devices not loading
- Check API response format
- Verify device data structure matches expected format
- Check console for errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.
