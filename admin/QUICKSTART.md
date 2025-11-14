# Quick Start Guide - Smart Home Dashboard

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Backend API server running (see backend setup)

## Installation Steps

### 1. Navigate to Admin Folder
```bash
cd admin
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and set your backend URL
# Default: VITE_API_URL=http://localhost:3000/api
```

### 4. Start Development Server
```bash
npm run dev
```

The dashboard will open at `http://localhost:5173`

## Default Login (Development)

For testing, use these credentials:
- **Email**: admin@smarthome.com
- **Password**: admin123

> Note: These are sample credentials. Configure your backend authentication accordingly.

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure Overview

```
src/
├── api/              # API integration layer
├── components/       # Reusable React components
│   ├── layout/       # Layout components (Sidebar, Topbar)
│   ├── devices/      # Device-specific cards
│   └── ui/           # UI primitives (Button, Card, Switch)
├── context/          # React Context for state management
├── hooks/            # Custom React hooks
├── pages/            # Page components
├── routes/           # Routing configuration
└── utils/            # Helper functions
```

## Key Features Implemented

### ✅ Authentication
- Login page with JWT token management
- Protected routes
- Auto-logout on token expiration

### ✅ Dashboard
- Overview statistics
- Quick device access
- Recent activity feed
- Real-time WebSocket updates

### ✅ Device Management
- Door Lock control (lock/unlock)
- Smart Light control (on/off, brightness)
- Smart Plug control (on/off, energy monitoring)
- Motion Sensor monitoring
- Device filtering and search

### ✅ Camera System
- Live feed viewing
- Multiple camera support
- Snapshot capture
- Recording controls
- Fullscreen mode

### ✅ Activity Logs
- Real-time event tracking
- Filter by device type
- Export to CSV
- Pagination

## Backend Integration

The dashboard expects these API endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Devices
- `GET /api/devices` - List all devices
- `POST /api/devices/:id/on` - Turn device on
- `POST /api/devices/:id/off` - Turn device off
- `POST /api/devices/:id/brightness` - Set brightness
- `POST /api/doorlock/lock` - Lock door
- `POST /api/doorlock/unlock` - Unlock door

### Camera
- `GET /api/camera/stream-url?cameraId=` - Get stream URL
- `GET /api/camera/snapshot?cameraId=` - Get snapshot

### Logs
- `GET /api/logs` - Get activity logs

### WebSocket
- `ws://your-server/ws/events` - Real-time events

## Troubleshooting

### Port Already in Use
```bash
# Change port in vite.config.js or kill process using port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Cannot Connect to Backend
1. Check backend server is running
2. Verify `VITE_API_URL` in `.env`
3. Check CORS configuration on backend
4. Inspect Network tab in browser DevTools

### WebSocket Connection Fails
1. Verify `VITE_WS_URL` in `.env`
2. Check WebSocket server is running
3. Ensure token is valid
4. Check browser console for errors

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
```

## Development Tips

### Hot Reload
The dev server supports hot module replacement (HMR). Changes to components will update without full page reload.

### Component Development
Use the browser React DevTools extension to inspect component state and props.

### API Testing
Use browser DevTools Network tab to inspect API requests and responses.

### Styling
- Tailwind CSS v4 (Oxide) is used for styling
- IntelliSense available for Tailwind classes in VS Code
- Custom colors can be added in tailwind config

## Next Steps

1. **Configure Backend**: Set up your IoT backend server
2. **Add Devices**: Connect real IoT devices to backend
3. **Customize**: Modify components to match your needs
4. **Deploy**: Build and deploy to production

## Production Build

```bash
# Build for production
npm run build

# Output will be in dist/ folder
# Deploy dist/ folder to your hosting service
```

## Support

For issues or questions:
1. Check the main README.md
2. Review error logs in browser console
3. Check Network tab for API errors
4. Open an issue on GitHub

## License

MIT License
