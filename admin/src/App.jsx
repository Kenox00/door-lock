import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { DevicesProvider } from './context/DevicesContext';
import { NotificationProvider } from './context/NotificationContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { AppRoutes } from './routes/AppRoutes';
import { UISettingsProvider } from './context/UISettingsContext';

function App() {
  return (
    <AuthProvider>
      <DevicesProvider>
        <NotificationProvider>
          <WebSocketProvider>
            <UISettingsProvider>
              <AppRoutes />
            </UISettingsProvider>
          </WebSocketProvider>
        </NotificationProvider>
      </DevicesProvider>
    </AuthProvider>
  );
}

export default App;
