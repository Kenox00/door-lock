import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { DevicesProvider } from './context/DevicesContext';
import { NotificationProvider } from './context/NotificationContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return (
    <AuthProvider>
      <DevicesProvider>
        <NotificationProvider>
          <WebSocketProvider>
            <AppRoutes />
          </WebSocketProvider>
        </NotificationProvider>
      </DevicesProvider>
    </AuthProvider>
  );
}

export default App;
