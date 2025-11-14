import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { cameraApi } from '../../api/cameraApi';

export const CameraViewer = ({ camera, compact = false }) => {
  const [streamUrl, setStreamUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    loadStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  const loadStream = async () => {
    if (!camera) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await cameraApi.getStreamUrl(camera.id || camera._id);
      if (response.data?.streamUrl) {
        setStreamUrl(response.data.streamUrl);
      } else {
        setError('Stream URL not available');
      }
    } catch (err) {
      console.error('Error loading stream:', err);
      setError(err.message || 'Failed to load camera stream');
    } finally {
      setLoading(false);
    }
  };

  const handleSnapshot = async () => {
    try {
      const blob = await cameraApi.getSnapshot(camera.id || camera._id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `snapshot-${Date.now()}.jpg`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error taking snapshot:', err);
      alert('Failed to take snapshot');
    }
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleRecord = async () => {
    try {
      if (isRecording) {
        await cameraApi.stopRecording(camera.id || camera._id);
        setIsRecording(false);
      } else {
        await cameraApi.startRecording(camera.id || camera._id);
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Error toggling recording:', err);
      alert('Failed to toggle recording');
    }
  };

  const CameraContent = () => (
    <div className={`relative ${compact ? 'h-48' : 'h-96'} bg-gray-900 rounded-lg overflow-hidden`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-white text-center">
            <svg className="animate-spin h-8 w-8 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm">Loading stream...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white text-sm">{error}</p>
            <Button size="sm" variant="outline" onClick={loadStream} className="mt-2">
              Retry
            </Button>
          </div>
        </div>
      )}

      {streamUrl && !loading && !error && (
        <>
          <img
            src={streamUrl}
            alt="Camera feed"
            className="w-full h-full object-cover"
            onError={() => setError('Failed to load stream')}
          />
          
          {/* Camera Info Overlay */}
          <div className="absolute top-0 left-0 right-0 bg-linear-to-b from-black/50 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-white text-sm font-medium">
                  {camera.name || 'Camera Feed'}
                </span>
              </div>
              {isRecording && (
                <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                  REC
                </span>
              )}
            </div>
          </div>

          {/* Controls Overlay */}
          {!compact && (
            <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/50 to-transparent p-4">
              <div className="flex items-center justify-center space-x-2">
                <Button size="sm" variant="ghost" onClick={handleSnapshot}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRecord}
                  className={isRecording ? 'bg-red-600' : ''}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </Button>

                <Button size="sm" variant="ghost" onClick={handleFullscreen}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (compact) {
    return <CameraContent />;
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <button
          onClick={handleFullscreen}
          className="absolute top-4 right-4 z-10 p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="w-full h-full">
          <CameraContent />
        </div>
      </div>
    );
  }

  return (
    <Card title={camera?.name || 'Camera Feed'} subtitle={camera?.location}>
      <CameraContent />
    </Card>
  );
};
