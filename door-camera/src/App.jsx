import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home } from './pages/Home';
import { Waiting } from './pages/Waiting';
import { Approved } from './pages/Approved';
import { Denied } from './pages/Denied';
import { DeviceConnect } from './pages/DeviceConnect';
import { useWebSocket } from './hooks/useWebSocket';
import { useSessionStore } from './store/sessionStore';
import { useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      staleTime: 0,
    },
  },
});

/**
 * Connection Status Indicator Component
 */
const ConnectionIndicator = ({ isConnected, reconnecting }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50"
      >
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm ${
            isConnected
              ? 'bg-green-500/20 border border-green-500/50'
              : reconnecting
              ? 'bg-yellow-500/20 border border-yellow-500/50'
              : 'bg-red-500/20 border border-red-500/50'
          }`}
        >
          {isConnected ? (
            <>
              <Wifi className="w-5 h-5 text-green-400" />
              <span className="text-green-400 text-sm font-medium">Connected</span>
            </>
          ) : reconnecting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Wifi className="w-5 h-5 text-yellow-400" />
              </motion.div>
              <span className="text-yellow-400 text-sm font-medium">Reconnecting...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5 text-red-400" />
              <span className="text-red-400 text-sm font-medium">Offline</span>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Main App Component
 */
function App() {
  const { connectionStatus, setError, setJwt, jwt, deviceId, deviceToken, isActivated } = useSessionStore();

  // Initialize JWT from environment on mount
  useEffect(() => {
    const envJwt = import.meta.env.VITE_JWT_TOKEN;
    if (envJwt && !jwt) {
      console.log('🔐 Loading JWT token from environment...');
      setJwt(envJwt);
    }
  }, [jwt, setJwt]);

  // Only auto-connect WebSocket if device is activated and has credentials
  const shouldConnect = isActivated && deviceId && deviceToken;

  // Log device status
  useEffect(() => {
    console.log('📱 Device Status:', {
      activated: isActivated,
      hasDeviceId: !!deviceId,
      hasToken: !!deviceToken,
      shouldConnect
    });
  }, [isActivated, deviceId, deviceToken, shouldConnect]);

  // Initialize WebSocket globally (only when device is onboarded)
  const { isConnected, reconnecting, error } = useWebSocket({
    autoConnect: shouldConnect, // Only connect after device onboarding
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Sync WebSocket errors to store
  useEffect(() => {
    if (error) {
      setError(error);
    }
  }, [error, setError]);

  // Log connection status changes
  useEffect(() => {
    console.log(`📡 WebSocket status: ${isConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
  }, [isConnected]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Connection Status Indicator */}
        <ConnectionIndicator isConnected={isConnected} reconnecting={reconnecting} />

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/device/connect" element={<DeviceConnect />} />
          <Route path="/waiting" element={<Waiting />} />
          <Route path="/approved" element={<Approved />} />
          <Route path="/denied" element={<Denied />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
