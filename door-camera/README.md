# Smart Door Camera Application

A production-ready React camera application for smart door lock systems with real-time visitor management, secure photo capture, and admin approval workflow.

## 🎯 Features

- **Always-On Camera**: Automatic rear camera activation with live preview
- **Instant Capture**: High-performance photo capture with compression
- **Real-Time Updates**: Socket.IO integration for instant approval/denial notifications
- **Backend Integration**: Fully integrated with doorlock-backend API
- **Beautiful UI**: Security-system styled interface with Tailwind CSS v4
- **Smart Recovery**: Automatic camera restart on failure
- **Responsive Design**: Optimized for tablets/phones mounted at doors

## 🚀 Tech Stack

- **React 19** + **Vite 7**
- **TypeScript**
- **Tailwind CSS v4** (Beta)
- **React Router v7**
- **Zustand** (State Management)
- **Socket.IO Client** (Real-time Updates)
- **Framer Motion** (Animations)
- **Axios** (HTTP Client)
- **Compressor.js** (Image Compression)

## 📦 Installation

### Option A: Automated Setup (Easiest) ⭐

Run the installation and startup scripts:

```powershell
# 1. Install everything
.\install.ps1

# 2. Start both servers (opens 2 new windows)
.\start.ps1
```

Then open `https://localhost:5173` in your browser!

### Option B: Manual Setup

### 1. Install Dependencies

```powershell
npm install
```

### 2. Environment Setup

Create `.env` file:

```env
VITE_API_URL=http://localhost:5000
VITE_DEVICE_ID=your_device_id_here
```

**Important**: Register your device in the backend first! See [Backend Integration Guide](./BACKEND_INTEGRATION.md).

### 3. Start Backend (Terminal 1)

```powershell
cd ../doorlock-backend
npm run dev
```

### 4. Start Camera App (Terminal 2)

```powershell
npm run dev
```

The app will run on `https://localhost:5173` (HTTPS enabled for camera access).

### 5. Test Backend Integration

```powershell
npm run test:backend
```

## 🏗️ Project Structure

```
src/
├── components/
│   ├── CameraView.tsx        # Camera preview with overlays
│   ├── RingButton.tsx        # Interactive ring button
│   └── StatusOverlay.tsx     # Connection/error indicators
├── hooks/
│   ├── useCamera.ts          # Camera management hook
│   ├── useCapture.ts         # Photo capture & upload
│   └── useSocketIO.ts        # Socket.IO real-time connection
├── pages/
│   ├── Home.tsx              # Main camera screen
│   ├── Waiting.tsx           # Admin approval screen
│   ├── Approved.tsx          # Access granted screen
│   └── Denied.tsx            # Access denied screen
├── lib/
│   ├── api.ts                # API client & endpoints
│   ├── config.ts             # App configuration
│   └── utils.ts              # Utility functions
├── store/
│   └── sessionStore.ts       # Zustand global state
├── App.jsx                   # Router & React Query setup
├── main.jsx                  # App entry point
└── index.css                 # Tailwind v4 styles
```

## 🔧 Configuration

Edit `src/lib/config.ts`:

```typescript
export const API_CONFIG = {
  baseURL: 'http://localhost:3000',
  pollInterval: 3000, // ms
};

export const CAMERA_CONFIG = {
  facingMode: 'environment', // 'user' for front camera
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

export const TIMINGS = {
  captureDelay: 200,
  buttonDisableDuration: 3000,
  approvedRedirectDelay: 5000,
  deniedRedirectDelay: 5000,
};
```

## 📡 Backend Integration

This app integrates with the **doorlock-backend** API. See [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md) for full details.

### Quick Overview

**Upload Endpoint:** `POST /api/door/upload`
- Accepts multipart/form-data with image file + deviceId
- Returns log object with `_id`, `status`, `imageUrl`

**Real-time Updates:** Socket.IO
- Listens for `access_granted` and `access_denied` events
- Automatically navigates to appropriate screen

**Device Registration Required:**
1. Login to backend: `POST /api/auth/login`
2. Register device: `POST /api/device/register`
3. Copy device ID to `.env` file

### Testing

```bash
# Test backend connection
npm run test:backend

# Expected output:
✅ Health Check: PASS
✅ Login: PASS
✅ Device Registration: PASS
✅ Image Upload: PASS
✅ Socket.IO: PASS
```

## 🧪 Testing Guide

### 1. Test Camera Preview

- Open app in browser
- Camera should start automatically
- Check for corner overlays and crosshair
- Verify rear camera is active (environment view)

### 2. Test Capture Function

```javascript
// Open browser console
// Check Zustand store
const state = window.__ZUSTAND_STORE__;
console.log(state.lastCapturedPhoto); // Should contain base64 after capture
```

### 3. Mock Backend Responses

Create `mockServer.js`:

```javascript
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const sessions = new Map();

app.post('/api/visitors/capture', (req, res) => {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { status: 'pending' });
  res.json({ sessionId, message: 'Captured', timestamp: new Date().toISOString() });
});

app.get('/api/visitors/status/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId) || { status: 'pending' };
  res.json({ ...session, sessionId: req.params.sessionId, timestamp: new Date().toISOString() });
});

// Simulate approval after 10 seconds
setTimeout(() => {
  sessions.forEach((value, key) => {
    if (value.status === 'pending') {
      sessions.set(key, { status: 'approved' });
    }
  });
}, 10000);

app.listen(3000, () => console.log('Mock server on :3000'));
```

### 4. Test Admin Approval Flow

- Capture photo → Wait screen
- After 10s (mock server) → Approved screen
- Auto-redirect to home

### 5. Test Camera Recovery

- Open DevTools → Console
- Stop camera track: `videoRef.current.srcObject.getTracks()[0].stop()`
- Camera should restart automatically after 2s

### 6. Test Offline Mode

- Open DevTools → Network
- Set to "Offline"
- Red banner should appear at top
- Re-enable network → banner disappears

## 📱 Deploy on Phone/Tablet

### Option 1: Local Network (Development)

1. **Find your IP address:**
   ```powershell
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

2. **Update Vite config for network access:**
   Already configured in `vite.config.js`:
   ```javascript
   server: {
     https: true,
     host: true, // Expose on network
   }
   ```

3. **Run dev server:**
   ```powershell
   npm run dev
   ```

4. **Access from device:**
   - Open browser on phone/tablet
   - Navigate to `https://192.168.1.100:5173`
   - Accept SSL warning (self-signed cert)
   - Grant camera permissions

### Option 2: Production Build

1. **Build for production:**
   ```powershell
   npm run build
   ```

2. **Preview build:**
   ```powershell
   npm run preview
   ```

3. **Deploy to hosting:**
   - **Vercel:** `vercel deploy`
   - **Netlify:** `netlify deploy`
   - **Your server:** Copy `dist/` folder

### Option 3: PWA (Offline-Capable)

Add to `index.html`:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0A0F1F">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

Create `public/manifest.json`:

```json
{
  "name": "Smart Door Camera",
  "short_name": "Door Cam",
  "start_url": "/",
  "display": "fullscreen",
  "orientation": "portrait",
  "background_color": "#0A0F1F",
  "theme_color": "#00E5FF",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 🛡️ Security Features

- **HTTPS Only**: Camera API requires secure context
- **No LocalStorage**: Photos stored in memory only
- **Automatic Recovery**: Camera restarts on failure
- **Connection Monitoring**: Offline detection & alerts
- **Permission Handling**: Graceful camera permission errors

## 🎨 Customization

### Change Colors

Edit `src/index.css`:

```css
@theme {
  --color-navy: #0A0F1F;      /* Background */
  --color-cyan: #00E5FF;      /* Accent */
  --color-cyan-glow: rgba(0, 229, 255, 0.3);
}
```

### Adjust Timings

Edit `src/lib/config.ts`:

```typescript
export const TIMINGS = {
  captureDelay: 200,              // Capture speed
  buttonDisableDuration: 3000,    // Button cooldown
  approvedRedirectDelay: 5000,    // Success screen duration
  deniedRedirectDelay: 5000,      // Denial screen duration
  cameraRetryDelay: 2000,         // Camera restart delay
};
```

## 🐛 Troubleshooting

### Camera Not Starting

- Ensure HTTPS is enabled
- Check browser permissions (chrome://settings/content/camera)
- Try different browser (Chrome/Edge recommended)
- Check console for errors

### Build Errors

```powershell
# Clear node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### TypeScript Errors

```powershell
# Ensure TypeScript is installed
npm install -D typescript
```

### Tailwind Not Working

Ensure `@import "tailwindcss";` is at top of `src/index.css`.

## 📄 License

MIT

## 👨‍💻 Author

Built with ❤️ for smart home security systems.
