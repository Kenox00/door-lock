import React from 'react';
import { Card } from '../ui/Card';

export const DeviceCredentials = ({ device }) => {
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    // You can add a toast notification here if you have one
    console.log(`${label} copied to clipboard`);
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h3 className="text-lg font-semibold text-gray-900">Device Credentials</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            device.status === 'online' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {device.status || 'offline'}
          </span>
        </div>

        {/* Device Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">DEVICE NAME</label>
          <p className="text-sm text-gray-900">{device.name}</p>
        </div>

        {/* Device ID */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <label className="block text-xs font-semibold text-gray-600 mb-2">DEVICE ID</label>
          <div className="flex items-center justify-between">
            <code className="text-sm font-mono text-gray-900 break-all mr-2">
              {device._id || device.id}
            </code>
            <button
              onClick={() => copyToClipboard(device._id || device.id, 'Device ID')}
              className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
              title="Copy to clipboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ESP ID */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <label className="block text-xs font-semibold text-gray-600 mb-2">ESP ID</label>
          <div className="flex items-center justify-between">
            <code className="text-sm font-mono text-gray-900">{device.espId}</code>
            <button
              onClick={() => copyToClipboard(device.espId, 'ESP ID')}
              className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
              title="Copy to clipboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Device Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">DEVICE TYPE</label>
          <p className="text-sm text-gray-900 capitalize">{device.deviceType || device.type}</p>
        </div>

        {/* Location */}
        {device.location && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">LOCATION</label>
            <p className="text-sm text-gray-900">{device.location}</p>
          </div>
        )}

        {/* Firmware Version */}
        {device.firmwareVersion && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">FIRMWARE VERSION</label>
            <p className="text-sm text-gray-900">{device.firmwareVersion}</p>
          </div>
        )}

        {/* Last Seen */}
        {device.lastSeen && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">LAST SEEN</label>
            <p className="text-sm text-gray-900">
              {new Date(device.lastSeen).toLocaleString()}
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs text-blue-800">
                Use these credentials to configure your ESP32 device. The device token is required for authentication and is not displayed here for security reasons.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
