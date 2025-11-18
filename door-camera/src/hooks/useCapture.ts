import { useState, useCallback } from 'react';
import Compressor from 'compressorjs';
import { useSessionStore } from '@/store/sessionStore';
import { uploadVisitorImage } from '@/lib/api';
import { COMPRESSION_CONFIG } from '@/lib/config';

export const useCapture = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const { setLastCapturedPhoto, setSessionId, setError } = useSessionStore();

  const compressImage = useCallback(
    (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
        new Compressor(blob, {
          quality: COMPRESSION_CONFIG.quality,
          maxWidth: COMPRESSION_CONFIG.maxWidth,
          maxHeight: COMPRESSION_CONFIG.maxHeight,
          mimeType: COMPRESSION_CONFIG.mimeType,
          success: (compressedBlob) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(compressedBlob);
          },
          error: reject,
        });
      });
    },
    []
  );

  const capturePhoto = useCallback(async (): Promise<string | null> => {
    console.log('📸 capturePhoto called');
    
    if (!videoRef.current) {
      console.error('❌ Video ref is null');
      return null;
    }
    
    if (isCapturing) {
      console.warn('⚠️ Already capturing, skipping');
      return null;
    }

    try {
      setIsCapturing(true);
      setError(null);
      
      console.log('🎥 Video ref available');

      // Create canvas
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log('🖼️ Canvas size:', canvas.width, 'x', canvas.height);

      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      console.log('✅ Frame drawn to canvas');

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
          COMPRESSION_CONFIG.mimeType,
          1.0
        );
      });

      // Compress image
      console.log('🗜️ Compressing image...');
      const base64Image = await compressImage(blob);
      console.log('✅ Compression complete, base64 length:', base64Image.length);

      // Store in state
      setLastCapturedPhoto(base64Image);
      console.log('💾 Saved to store');

      // Upload to backend
      console.log('📤 Starting upload...');
      const response = await uploadVisitorImage(base64Image);
      const logId = response.data.visitorLogId; // Backend returns visitorLogId
      setSessionId(logId);
      
      console.log('✅ Upload complete, visitor log ID:', logId);

      return logId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture photo';
      setError(errorMessage);
      console.error('Capture error:', err);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [videoRef, isCapturing, compressImage, setLastCapturedPhoto, setSessionId, setError]);

  return {
    capturePhoto,
    isCapturing,
  };
};
