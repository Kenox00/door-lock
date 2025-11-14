import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { CameraViewer } from '../../components/devices/CameraViewer';
import { cameraApi } from '../../api/cameraApi';

export const LiveFeed = () => {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      setLoading(true);
      const response = await cameraApi.getAllCameras();
      if (response.data) {
        setCameras(response.data);
        if (response.data.length > 0) {
          setSelectedCamera(response.data[0]);
        }
      }
    } catch (err) {
      console.error('Error loading cameras:', err);
      setError(err.message || 'Failed to load cameras');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600">Loading cameras...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Card>
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Cameras</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={loadCameras}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  if (cameras.length === 0) {
    return (
      <DashboardLayout>
        <Card>
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Cameras Found</h3>
            <p className="text-gray-500">Add a camera to start monitoring your home.</p>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Camera Feed</h1>
          <p className="text-gray-500 mt-1">Monitor your home in real-time</p>
        </div>

        {/* Camera Selector */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {cameras.map((camera) => (
            <button
              key={camera.id || camera._id}
              onClick={() => setSelectedCamera(camera)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
                ${selectedCamera?.id === camera.id || selectedCamera?._id === camera._id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }
              `}
            >
              {camera.name || 'Camera'}
            </button>
          ))}
        </div>

        {/* Main Camera View */}
        {selectedCamera && (
          <CameraViewer camera={selectedCamera} />
        )}

        {/* Camera Grid - Thumbnails */}
        {cameras.length > 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">All Cameras</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cameras.map((camera) => (
                <div
                  key={camera.id || camera._id}
                  onClick={() => setSelectedCamera(camera)}
                  className="cursor-pointer"
                >
                  <CameraViewer camera={camera} compact />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Camera Info */}
        {selectedCamera && (
          <Card title="Camera Information">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="text-base font-semibold text-gray-900 mt-1">
                  {selectedCamera.name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Location</p>
                <p className="text-base font-semibold text-gray-900 mt-1">
                  {selectedCamera.location || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Resolution</p>
                <p className="text-base font-semibold text-gray-900 mt-1">
                  {selectedCamera.resolution || '1080p'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className={`text-base font-semibold mt-1 ${
                  selectedCamera.online ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedCamera.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};
