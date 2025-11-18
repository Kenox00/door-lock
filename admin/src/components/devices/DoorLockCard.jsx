import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { QRCodeModal } from './QRCodeModal';
import { useWebSocketContext } from '../../context/WebSocketContext';
import { devicesApi } from '../../api/devicesApi';
import { timeAgo } from '../../utils/format';

export const DoorLockCard = ({ device }) => {
  const navigate = useNavigate();
  const { sendDeviceCommand, isConnected } = useWebSocketContext();
  const [loading, setLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);

  const isLocked = device.lockState === 'locked' || device.locked || device.status === 'locked';
  const isOnline = device.status === 'online' || device.online !== false;

  const handleToggleLock = async () => {
    setLoading(true);
    const command = isLocked ? 'unlock' : 'lock';
    const sent = await sendDeviceCommand(device._id || device.id, command);
    
    if (!sent) {
      alert('Failed to send command - not connected');
    }
    
    // Keep loading state for 2 seconds to show visual feedback
    setTimeout(() => setLoading(false), 2000);
  };

  const handleViewQR = async () => {
    try {
      setLoadingQR(true);
      const response = await devicesApi.getDeviceQR(device._id || device.id);
      if (response.data) {
        setQrData(response.data);
        setShowQRModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch QR code:', error);
      alert('Failed to load QR code');
    } finally {
      setLoadingQR(false);
    }
  };

  return (
    <Card hover className="relative">
      {/* Status Indicator */}
      <div className="absolute top-4 right-4">
        <div
          className={`w-3 h-3 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-gray-300'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      </div>

      {/* Icon */}
      <div className={`flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
        isLocked ? 'bg-gray-100' : 'bg-green-100'
      }`}>
        <svg className={`w-8 h-8 ${
          isLocked ? 'text-gray-600' : 'text-green-600'
        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={
              isLocked
                ? 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                : 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z'
            }
          />
        </svg>
      </div>

      {/* Device Info */}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {device.name || 'Door Lock'}
      </h3>
      <p className="text-sm text-gray-500 mb-4">{device.location || 'Front Door'}</p>

      {/* Status Badge */}
      <div className="flex items-center justify-center mb-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${
            isLocked
              ? 'bg-gray-100 text-gray-700 border-gray-300'
              : 'bg-green-100 text-green-700 border-green-300'
          }`}
        >
          {isLocked ? 'Locked' : 'Unlocked'}
        </span>
      </div>

      {/* Controls */}
      <Button
        variant={isLocked ? 'success' : 'danger'}
        fullWidth
        loading={loading}
        disabled={!isOnline || !isConnected}
        onClick={handleToggleLock}
        className="mb-4"
      >
        {isLocked ? 'Unlock' : 'Lock'}
      </Button>

      {/* Additional Info */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Last Activity:</span>
          <span className="text-gray-900 font-medium">
            {timeAgo(device.lastUpdated || device.updatedAt)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Battery:</span>
          <span className="text-gray-900 font-medium">{device.battery || 95}%</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        <Button 
          variant="outline" 
          fullWidth
          onClick={handleViewQR}
          loading={loadingQR}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          QR Code
        </Button>
        <Button 
          variant="secondary" 
          fullWidth
          onClick={() => navigate(`/devices/${device._id || device.id}`)}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Details
        </Button>
      </div>

      {/* QR Code Modal */}
      {qrData && (
        <QRCodeModal
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setQrData(null);
          }}
          qrData={qrData}
        />
      )}
    </Card>
  );
};
