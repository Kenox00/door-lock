import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/lib/config';

interface VisitorLog {
  _id: string;
  imageUrl: string;
  status: 'pending' | 'granted' | 'denied';
  timestamp: string;
  deviceId: string;
}

interface SocketEvents {
  new_visitor: (data: VisitorLog) => void;
  access_granted: (data: VisitorLog) => void;
  access_denied: (data: VisitorLog) => void;
}

export const useSocketIO = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize Socket.IO connection
    socketRef.current = io(API_CONFIG.baseURL, {
      path: API_CONFIG.socketPath,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const on = <E extends keyof SocketEvents>(event: E, callback: SocketEvents[E]) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = <E extends keyof SocketEvents>(event: E, callback?: SocketEvents[E]) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    on,
    off,
  };
};
