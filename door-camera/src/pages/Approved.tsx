import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, DoorOpen } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { TIMINGS } from '@/lib/config';

export const Approved: React.FC = () => {
  const navigate = useNavigate();
  const { clearSession } = useSessionStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      clearSession();
      navigate('/');
    }, TIMINGS.approvedRedirectDelay);

    return () => clearTimeout(timer);
  }, [navigate, clearSession]);

  return (
    <div className="relative w-full h-full bg-[var(--color-navy)]">
      {/* Animated background gradient */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-[var(--color-navy)] to-[var(--color-cyan)]/20"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-8 p-8">
        {/* Success icon with animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8, bounce: 0.5 }}
          className="relative"
        >
          {/* Outer glow rings */}
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 -m-8 rounded-full bg-green-400/30 blur-2xl"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="absolute inset-0 -m-8 rounded-full bg-green-400/30 blur-xl"
          />

          {/* Icon background */}
          <div className="bg-green-500/20 p-8 rounded-full border-4 border-green-400">
            <CheckCircle2 className="w-32 h-32 text-green-400" strokeWidth={2} />
          </div>
        </motion.div>

        {/* Text content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center space-y-4"
        >
          <h2 className="text-white text-4xl font-bold">Access Granted</h2>
          <p className="text-gray-300 text-xl">Welcome! The door is opening...</p>
        </motion.div>

        {/* Door animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="relative"
        >
          <motion.div
            animate={{ x: [0, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <DoorOpen className="w-24 h-24 text-[var(--color-cyan)]" strokeWidth={1.5} />
          </motion.div>
        </motion.div>

        {/* Progress indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="w-64 h-2 bg-white/10 rounded-full overflow-hidden"
        >
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: TIMINGS.approvedRedirectDelay / 1000, ease: 'linear' }}
            className="h-full bg-gradient-to-r from-green-400 to-[var(--color-cyan)] rounded-full"
          />
        </motion.div>

        {/* Countdown message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-white/60 text-sm"
        >
          Returning to home screen...
        </motion.p>
      </div>
    </div>
  );
};
