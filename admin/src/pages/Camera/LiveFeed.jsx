import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { CameraViewer } from '../../components/devices/CameraViewer';
import { devicesApi } from '../../api/devicesApi';
import { logsApi } from '../../api/logsApi';

export const LiveFeed = () => {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentVisitors, setRecentVisitors] = useState([]);

  useEffect(() => {
    loadCameras();
    loadRecentVisitors();
  }, []);

  const loadCameras = async () => {
    try {
      setLoading(true);
      // Get all devices and filter for camera types
      const response = await devicesApi.getAllDevices();
      if (response.data) {
        // Filter for camera devices (esp32-cam or camera type)
        const cameraDevices = response.data.filter(device => 
          device.deviceType === 'esp32-cam' || 
          device.type === 'camera' ||
          device.deviceType === 'camera'
        );
        setCameras(cameraDevices);
        if (cameraDevices.length > 0) {
          setSelectedCamera(cameraDevices[0]);
        }
      }
    } catch (err) {
      console.error('Error loading cameras:', err);
      setError(err.message || 'Failed to load cameras');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentVisitors = async () => {
    try {
      const response = await logsApi.getVisitorLogs({ limit: 10 });
      if (response?.data) {
        const visitors = Array.isArray(response.data) ? response.data : response.data.data || [];
        setRecentVisitors(visitors);
      }
    } catch (err) {
      console.error('Error loading recent visitors:', err);
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
                  selectedCamera.status === 'online' || selectedCamera.online ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedCamera.status === 'online' || selectedCamera.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Recent Visitor Snapshots */}
        {recentVisitors.length > 0 && (
          <Card title="Recent Visitor Snapshots">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {recentVisitors.map((visitor) => (
                <div
                  key={visitor._id}
                  className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-all"
                >
                  <img
                    src={visitor.imageUrl}
                    alt="Visitor"
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-center">
                      <p className="text-xs font-medium">
                        {new Date(visitor.timestamp).toLocaleString()}
                      </p>
                      <p className={`text-xs mt-1 font-semibold ${
                        visitor.status === 'granted' ? 'text-green-400' : 
                        visitor.status === 'denied' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {visitor.status.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};
