import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { QRCodeModal } from './QRCodeModal';
import { devicesApi } from '../../api/devicesApi';
import { QrCode, Wifi, WifiOff, Circle, CheckCircle } from 'lucide-react';

export const UniversalDeviceCard = ({ device }) => {
  const navigate = useNavigate();
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);

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

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'door-lock':
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'esp32-cam':
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'motion-sensor':
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        );
    }
  };

  const getDeviceTypeLabel = (type) => {
    const types = {
      'door-lock': 'Door Lock',
      'esp32-cam': 'ESP32 Camera',
      'motion-sensor': 'Motion Sensor',
      'other': 'Other Device'
    };
    return types[type] || type;
  };

  const isOnline = device.online || device.status === 'online';
  const isActivated = device.activated;

  return (
    <Card hover className="relative">
      {/* Status Indicators */}
      <div className="absolute top-4 right-4 flex gap-2">
        {/* Online Status */}
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        >
          {isOnline ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
        </div>

        {/* Activation Status */}
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            isActivated ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
          }`}
          title={isActivated ? 'Activated' : 'Pending Activation'}
        >
          {isActivated ? (
            <CheckCircle className="w-3 h-3" />
          ) : (
            <Circle className="w-3 h-3" />
          )}
        </div>
      </div>

      {/* Device Icon */}
      <div className={`flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
        isOnline ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
      }`}>
        {getDeviceIcon(device.deviceType)}
      </div>

      {/* Device Info */}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {device.name}
      </h3>
      <p className="text-sm text-gray-500 mb-1">{getDeviceTypeLabel(device.deviceType)}</p>
      {device.room && (
        <p className="text-xs text-gray-400 mb-3">📍 {device.room}</p>
      )}

      {/* ESP ID */}
      <div className="mb-4">
        <div className="bg-gray-50 px-3 py-2 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">ESP ID</p>
          <p className="text-sm font-mono text-gray-900">{device.espId}</p>
        </div>
      </div>

      {/* Status Info */}
      <div className="border-t border-gray-200 pt-4 mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Status:</span>
          <span className={`font-medium ${
            device.status === 'online' ? 'text-green-600' : 'text-gray-600'
          }`}>
            {device.status || 'offline'}
          </span>
        </div>
        {device.lastSeen && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Last Seen:</span>
            <span className="text-gray-900 font-medium">
              {new Date(device.lastSeen).toLocaleString()}
            </span>
          </div>
        )}
        {device.location && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Location:</span>
            <span className="text-gray-900 font-medium">{device.location}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button 
          variant="primary" 
          fullWidth
          onClick={handleViewQR}
          loading={loadingQR}
          className="flex items-center justify-center"
        >
          <QrCode className="w-4 h-4 mr-2" />
          View QR Code
        </Button>
        
        <div className="flex gap-2">
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
          
          <Button 
            variant="outline" 
            fullWidth
            onClick={() => navigate('/devices/management')}
          >
            Manage
          </Button>
        </div>
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
