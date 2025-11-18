import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useQROnboarding } from '@/hooks/useQROnboarding';
import { useSessionStore } from '@/store/sessionStore';

/**
 * Device Connect Page
 * Handles QR code onboarding flow
 * 
 * This page is opened when scanning a QR code with format:
 * /device/connect?deviceId=xxx&token=yyy&type=camera&room=Entrance
 */
export const DeviceConnect: React.FC = () => {
  const { isActivated } = useQROnboarding();
  const { error, deviceId, room } = useSessionStore();

  return (
    <div className="relative w-full h-full bg-[var(--color-navy)] flex items-center justify-center">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)] via-[var(--color-navy-light)] to-[var(--color-navy)]" />

      {/* Content */}
      <div className="relative z-10 max-w-md w-full px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-md bg-white/5 rounded-2xl p-8 border border-[var(--color-cyan)]/20 shadow-xl"
        >
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {error ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <XCircle className="w-20 h-20 text-red-500" />
              </motion.div>
            ) : isActivated ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <CheckCircle className="w-20 h-20 text-green-500" />
              </motion.div>
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="w-20 h-20 text-[var(--color-cyan)]" />
              </motion.div>
            )}
          </div>

          {/* Status Text */}
          <div className="text-center space-y-4">
            {error ? (
              <>
                <h2 className="text-2xl font-bold text-red-400">
                  Activation Failed
                </h2>
                <p className="text-gray-300">
                  {error}
                </p>
                <p className="text-sm text-gray-400 mt-4">
                  Please scan a valid QR code to onboard this device.
                </p>
              </>
            ) : isActivated ? (
              <>
                <h2 className="text-2xl font-bold text-green-400">
                  Device Activated!
                </h2>
                <p className="text-gray-300">
                  Your camera has been successfully registered.
                </p>
                {deviceId && (
                  <div className="mt-4 p-3 bg-white/5 rounded-lg border border-[var(--color-cyan)]/10">
                    <p className="text-xs text-gray-400">Device ID</p>
                    <p className="text-sm text-[var(--color-cyan)] font-mono">
                      {deviceId}
                    </p>
                  </div>
                )}
                {room && (
                  <div className="mt-2 p-3 bg-white/5 rounded-lg border border-[var(--color-cyan)]/10">
                    <p className="text-xs text-gray-400">Location</p>
                    <p className="text-sm text-white font-medium">
                      {room}
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-400 mt-4">
                  Redirecting to camera view...
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-white">
                  Activating Device
                </h2>
                <p className="text-gray-300">
                  Please wait while we register your camera...
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center"
        >
          <p className="text-xs text-gray-400">
            Smart Door Camera System
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Secure IoT Device Onboarding
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default DeviceConnect;
