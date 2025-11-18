import { motion } from 'framer-motion';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';

export const StatusOverlay: React.FC = () => {
  const { connectionStatus, error } = useSessionStore();

  if (connectionStatus === 'online' && !error) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Offline indicator */}
      {connectionStatus === 'offline' && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="bg-red-500/90 backdrop-blur-sm px-6 py-4 flex items-center justify-center gap-3"
        >
          <WifiOff className="w-5 h-5 text-white" />
          <span className="text-white font-medium">No Connection</span>
        </motion.div>
      )}

      {/* Error indicator */}
      {error && connectionStatus === 'online' && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="bg-yellow-500/90 backdrop-blur-sm px-6 py-4 flex items-center justify-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-white" />
          <span className="text-white font-medium text-sm">{error}</span>
        </motion.div>
      )}
    </div>
  );
};
