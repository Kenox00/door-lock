import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TIMINGS } from '@/lib/config';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useSessionStore } from '@/store/sessionStore';
import { EVENTS, BellPressedPayload } from '@/lib/websocketEvents';

interface RingButtonProps {
  onRing: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const RingButton: React.FC<RingButtonProps> = ({
  onRing,
  disabled = false,
  className,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isDisabled, setIsDisabled] = useState(disabled);
  const { emitEvent, isConnected } = useWebSocket();
  const { deviceId, updateDeviceInfo } = useSessionStore();

  useEffect(() => {
    setIsDisabled(disabled);
  }, [disabled]);

  const handleRing = async () => {
    if (isDisabled) return;

    setIsPressed(true);
    setIsDisabled(true);

    try {
      // Update device info state
      updateDeviceInfo({ bell: true });

      // Emit WebSocket event for bell press
      const bellPayload: BellPressedPayload = {
        deviceId,
        timestamp: Date.now(),
        pressedBy: 'visitor',
        metadata: {
          location: 'front-door',
          duration: 1000,
        },
      };
      
      if (isConnected) {
        emitEvent(EVENTS.BELL_PRESSED, bellPayload);
        console.log('🔔 Bell press event emitted via WebSocket');
      } else {
        console.warn('⚠️ WebSocket not connected, bell event queued');
        // Socket.io will queue and send when reconnected
        emitEvent(EVENTS.BELL_PRESSED, bellPayload);
      }

      // Call the original onRing handler (for UI/backend REST if needed)
      await onRing();

      // Reset bell state after a delay
      setTimeout(() => {
        updateDeviceInfo({ bell: false });
      }, 3000);
    } catch (error) {
      console.error('❌ Error handling bell press:', error);
    } finally {
      // Re-enable after delay
      setTimeout(() => {
        setIsPressed(false);
        setIsDisabled(false);
      }, TIMINGS.buttonDisableDuration);
    }
  };

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Ripple effect */}
      {isPressed && (
        <>
          <motion.div
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full bg-[var(--color-cyan)] blur-xl"
          />
          <motion.div
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            className="absolute inset-0 rounded-full bg-[var(--color-cyan)]"
          />
        </>
      )}

      {/* Button */}
      <motion.button
        whileHover={!isDisabled ? { scale: 1.05 } : {}}
        whileTap={!isDisabled ? { scale: 0.95 } : {}}
        onClick={handleRing}
        disabled={isDisabled}
        className={cn(
          'relative w-32 h-32 rounded-full flex items-center justify-center',
          'bg-[var(--color-cyan)] shadow-lg',
          'transition-all duration-300',
          isDisabled && 'opacity-50 cursor-not-allowed',
          !isDisabled && 'shadow-[0_0_30px_var(--color-cyan-glow)]'
        )}
      >
        {/* Inner glow */}
        <div className="absolute inset-0 rounded-full bg-white/10 blur-md" />
        
        {/* Icon */}
        <motion.div
          animate={isPressed ? { rotate: [0, -15, 15, -15, 15, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <Bell className="w-16 h-16 text-[var(--color-navy)]" fill="currentColor" />
        </motion.div>

        {/* Pulse animation when idle */}
        {!isDisabled && !isPressed && (
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full border-4 border-[var(--color-cyan)]"
          />
        )}
      </motion.button>

      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute -bottom-16 text-center"
      >
        <p className="text-white text-xl font-semibold tracking-wide">
          {isPressed ? 'PROCESSING...' : 'RING BELL'}
        </p>
      </motion.div>
    </div>
  );
};
