import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { devicesApi } from '../../api/devicesApi';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export const DeviceConnect = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const [deviceInfo, setDeviceInfo] = useState(null);

  useEffect(() => {
    const activateDevice = async () => {
      try {
        // Extract parameters from URL
        const deviceId = searchParams.get('deviceId');
        const token = searchParams.get('token');

        if (!deviceId || !token) {
          setStatus('error');
          setMessage('Invalid activation link. Missing required parameters.');
          return;
        }

        // Call activation endpoint
        const response = await devicesApi.activateDevice(deviceId, token);

        if (response.success) {
          setStatus('success');
          setDeviceInfo({
            name: response.data.name,
            deviceType: response.data.deviceType,
            room: response.data.room,
            deviceId: response.data.deviceId
          });
          setMessage('Device activated successfully!');
        } else {
          setStatus('error');
          setMessage(response.message || 'Failed to activate device');
        }
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || error.message || 'Failed to activate device');
      }
    };

    activateDevice();
  }, [searchParams]);

  const handleContinue = () => {
    // Redirect to your mobile app or documentation
    window.location.href = 'https://your-app-domain.com/setup-instructions';
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Loader className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Activating Device...</h2>
          <p className="text-gray-600">Please wait while we configure your device</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-600">{message}</p>
          </div>

          {deviceInfo && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Device Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-gray-900">{deviceInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {deviceInfo.deviceType.replace('-', ' ')}
                  </span>
                </div>
                {deviceInfo.room && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Room:</span>
                    <span className="font-medium text-gray-900">{deviceInfo.room}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Device ID:</span>
                  <span className="font-mono text-xs text-gray-900 break-all">
                    {deviceInfo.deviceId}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm">Next Steps</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Configure your device with the provided credentials</li>
              <li>Connect your device to WiFi</li>
              <li>Wait for the device to establish connection</li>
              <li>Monitor status in the admin dashboard</li>
            </ol>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              View Setup Instructions
            </button>
            <button
              onClick={() => window.close()}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <XCircle className="w-20 h-20 text-red-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Activation Failed</h2>
            <p className="text-gray-600">{message}</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-900 mb-2 text-sm">Common Issues</h3>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>Invalid or expired activation link</li>
              <li>Device already activated</li>
              <li>Network connection issues</li>
              <li>Token mismatch or corrupted QR code</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.close()}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
