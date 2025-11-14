import React from 'react';
import { useWebSocketContext } from '../../context/WebSocketContext';

/**
 * ConnectionStatus Component
 * Shows real-time WebSocket connection status in the topbar
 */
export const ConnectionStatus = () => {
  const { isConnected, connectionError, reconnectAttempts } = useWebSocketContext();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium text-green-700">Connected</span>
      </div>
    );
  }

  if (reconnectAttempts > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium text-yellow-700">
          Reconnecting... ({reconnectAttempts})
        </span>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-sm font-medium text-red-700">Disconnected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
      <span className="text-sm font-medium text-gray-600">Connecting...</span>
    </div>
  );
};

export default ConnectionStatus;
