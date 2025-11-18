import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { CAMERA_CONFIG, TIMINGS } from '@/lib/config';

export const useCamera = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const streamRef = useRef<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  
  const { setCameraReady, setError: setGlobalError } = useSessionStore();

  useEffect(() => {
    let mounted = true;

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const startCamera = async () => {
      try {
        if (!mounted) return;
        
        setIsLoading(true);
        setError(null);
        setGlobalError(null);

        // Stop existing stream
        stopCamera();

        // Detect mobile devices
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        // Adjust constraints for mobile
        const constraints = {
          video: {
            facingMode: CAMERA_CONFIG.facingMode,
            width: isMobile ? { ideal: 1280 } : CAMERA_CONFIG.width,
            height: isMobile ? { ideal: 720 } : CAMERA_CONFIG.height,
            frameRate: isMobile ? { ideal: 24, max: 30 } : CAMERA_CONFIG.frameRate,
            ...(isIOS && {
              // iOS-specific constraints
              aspectRatio: { ideal: 16 / 9 },
            }),
          },
          audio: false,
        };
        
        console.log('📱 Device type:', isMobile ? 'Mobile' : 'Desktop');
        console.log('📷 Camera constraints:', constraints);

        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!mounted) {
          // Component unmounted, stop the stream
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          
          // Wait for video to be ready
          await new Promise<void>((resolve, reject) => {
            const onLoadedMetadata = () => {
              video.play()
                .then(() => resolve())
                .catch(reject);
              cleanup();
            };
            
            const onError = () => {
              reject(new Error('Video failed to load'));
              cleanup();
            };
            
            const cleanup = () => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
            };
            
            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);
            
            // If metadata is already loaded, trigger immediately
            if (video.readyState >= 1) {
              onLoadedMetadata();
            }
          });

          if (mounted) {
            setCameraReady(true);
            setIsLoading(false);
            
            // Start freeze detection
            const freezeCheckInterval = setInterval(() => {
              if (video.readyState < 2) {
                console.warn('⚠️ Video freeze detected, retrying...');
                clearInterval(freezeCheckInterval);
                startCamera();
              }
            }, 5000); // Check every 5 seconds
            
            // Store interval for cleanup
            if (retryTimeoutRef.current !== null) {
              window.clearTimeout(retryTimeoutRef.current);
            }
            retryTimeoutRef.current = freezeCheckInterval as unknown as number;
          }
        }
      } catch (err) {
        if (!mounted) return;
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
        console.error('Camera error:', errorMessage);
        setError(errorMessage);
        setGlobalError(errorMessage);
        setCameraReady(false);
        setIsLoading(false);

        // Retry after delay
        if (mounted) {
          retryTimeoutRef.current = window.setTimeout(() => {
            if (mounted) startCamera();
          }, TIMINGS.cameraRetryDelay);
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      stopCamera();
      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [videoRef, setCameraReady, setGlobalError]);

  // Expose retry function
  const retryCamera = () => {
    setIsLoading(true);
    setError(null);
    // Trigger re-mount by clearing and setting the video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    // The effect will restart the camera
    window.location.reload();
  };

  return {
    isLoading,
    error,
    retryCamera,
  };
};
