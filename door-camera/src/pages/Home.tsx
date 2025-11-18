import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CameraView } from '@/components/CameraView';
import { RingButton } from '@/components/RingButton';
import { StatusOverlay } from '@/components/StatusOverlay';
import { useCamera } from '@/hooks/useCamera';
import { useCapture } from '@/hooks/useCapture';
import { useSessionStore } from '@/store/sessionStore';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  // Remove duplicate useCamera call - CameraView handles it
  const { capturePhoto, isCapturing } = useCapture(videoRef);
  const { cameraReady } = useSessionStore();

  const handleRing = async () => {
    console.log('🔔 Ring button clicked');
    console.log('Camera ready:', cameraReady);
    console.log('Is capturing:', isCapturing);
    
    const sessionId = await capturePhoto();
    console.log('📸 Capture result:', sessionId);
    
    if (sessionId) {
      navigate(`/waiting?sessionId=${sessionId}`);
    } else {
      console.error('❌ Failed to capture photo');
    }
  };

  return (
    <div className="relative w-full h-full bg-[var(--color-navy)]">
      {/* Status overlay */}
      <StatusOverlay />

      {/* Camera view */}
      <CameraView className="absolute inset-0" videoRef={videoRef} />

      {/* Gradient overlay for better contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--color-navy)]/60 pointer-events-none" />

      {/* Top bar */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="absolute top-0 left-0 right-0 p-6 z-10"
      >
        <div className="backdrop-blur-md bg-[var(--color-navy)]/30 rounded-2xl p-4 border border-[var(--color-cyan)]/20">
          <h1 className="text-white text-2xl font-bold text-center tracking-wider">
            SMART DOOR SECURITY
          </h1>
        </div>
      </motion.div>

      {/* Ring button container */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="absolute bottom-24 left-0 right-0 flex justify-center z-10"
      >
        <RingButton onRing={handleRing} disabled={!cameraReady || isCapturing} />
      </motion.div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-6 left-0 right-0 text-center z-10"
      >
        <p className="text-white/70 text-sm">Press the bell to request access</p>
      </motion.div>
    </div>
  );
};
