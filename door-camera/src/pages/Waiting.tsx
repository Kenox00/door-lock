import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { EVENTS } from '@/lib/websocketEvents';

export const Waiting: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const { lastCapturedPhoto } = useSessionStore();
  const { socket, isConnected } = useWebSocket();

  // Redirect if no session ID
  useEffect(() => {
    if (!sessionId) {
      navigate('/');
    }
  }, [sessionId, navigate]);

  // Listen for approval/rejection events
  useEffect(() => {
    if (!socket || !sessionId) {
      console.log('⚠️ Cannot listen for events:', { hasSocket: !!socket, sessionId });
      return;
    }

    console.log('========== WAITING PAGE EVENT SETUP ==========');
    console.log('👂 Listening for access events');
    console.log('🆔 Current sessionId (visitorLogId):', sessionId);
    console.log('🔌 Socket connected:', socket.connected);
    console.log('📱 Socket ID:', socket.id);
    console.log('================================================');

    const handleAccessGranted = (data: any) => {
      console.log('========== ACCESS_GRANTED IN WAITING PAGE ==========');
      console.log('✅ ACCESS_GRANTED event received in Waiting component');
      console.log('📋 Full event data:', JSON.stringify(data, null, 2));
      console.log('🔍 Comparing:');
      console.log('   - data.visitorId:', data.visitorId);
      console.log('   - data._id:', data._id);
      console.log('   - sessionId:', sessionId);
      console.log('   - Match visitorId?', data.visitorId === sessionId);
      console.log('   - Match _id?', data._id === sessionId);
      
      // Check if this is for the current visitor
      if (data.visitorId === sessionId || data._id === sessionId) {
        console.log('🎉 ✅ MATCH FOUND! Navigating to approved page');
        navigate('/approved');
      } else {
        console.log('⚠️ No match - this event is for a different visitor');
        console.log('   Expected:', sessionId);
        console.log('   Got:', data.visitorId || data._id);
      }
      console.log('================================================');
    };

    const handleAccessDenied = (data: any) => {
      console.log('========== ACCESS_DENIED IN WAITING PAGE ==========');
      console.log('❌ ACCESS_DENIED event received in Waiting component');
      console.log('📋 Full event data:', JSON.stringify(data, null, 2));
      console.log('🔍 Comparing:');
      console.log('   - data.visitorId:', data.visitorId);
      console.log('   - data._id:', data._id);
      console.log('   - sessionId:', sessionId);
      
      // Check if this is for the current visitor
      if (data.visitorId === sessionId || data._id === sessionId) {
        console.log('🎉 ✅ MATCH FOUND! Navigating to denied page');
        navigate('/denied');
      } else {
        console.log('⚠️ No match - this event is for a different visitor');
      }
      console.log('================================================');
    };

    console.log('📡 Registering event listeners for ACCESS_GRANTED and ACCESS_DENIED');
    socket.on(EVENTS.ACCESS_GRANTED, handleAccessGranted);
    socket.on(EVENTS.ACCESS_DENIED, handleAccessDenied);

    return () => {
      console.log('🧹 Cleaning up event listeners in Waiting component');
      socket.off(EVENTS.ACCESS_GRANTED, handleAccessGranted);
      socket.off(EVENTS.ACCESS_DENIED, handleAccessDenied);
    };
  }, [socket, sessionId, navigate]);

  return (
    <div className="relative w-full h-full bg-[var(--color-navy)]">
      {/* Blurred background image */}
      {lastCapturedPhoto && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30"
          style={{ backgroundImage: `url(${lastCapturedPhoto})` }}
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-navy)]/80 to-[var(--color-navy)]/95" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-8 p-8">
        {/* Animated loader */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="relative"
        >
          <div className="w-32 h-32 rounded-full border-4 border-[var(--color-cyan)]/20 border-t-[var(--color-cyan)] shadow-[0_0_30px_var(--color-cyan-glow)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-16 h-16 text-[var(--color-cyan)]" />
          </div>
        </motion.div>

        {/* Text content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-4"
        >
          <h2 className="text-white text-3xl font-bold">Waiting for Approval</h2>
          <p className="text-gray-300 text-lg">
            An administrator will review your request shortly...
          </p>
        </motion.div>

        {/* Session info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="backdrop-blur-md bg-white/5 rounded-xl p-4 border border-[var(--color-cyan)]/20"
        >
          <p className="text-[var(--color-cyan)] text-sm font-mono">
            Session ID: {sessionId?.slice(0, 8)}...
          </p>
        </motion.div>

        {/* Pulsing dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex gap-2"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
              className="w-3 h-3 rounded-full bg-[var(--color-cyan)]"
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
};
