import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { QRCodeModal } from './QRCodeModal';
import { devicesApi } from '../../api/devicesApi';
import { QrCode, Eye, Settings } from 'lucide-react';
import { useUISettings } from '../../context/UISettingsContext';

export const UniversalDeviceCard = ({ device }) => {
  const navigate = useNavigate();
  const { density } = useUISettings();
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
    } catch (e) {
      console.error('Failed to fetch QR code', e);
    } finally {
      setLoadingQR(false);
    }
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'door-lock':
        return <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>;
      case 'esp32-cam':
        return <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>;
      case 'motion-sensor':
        return <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>;
      default:
        return <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>;
    }
  };

  const getDeviceTypeLabel = (type) => {
    const types = { 'door-lock': 'Door Lock', 'esp32-cam': 'ESP32 Camera', 'motion-sensor': 'Motion Sensor', other: 'Other Device' };
    return types[type] || type;
  };

  const isOnline = device.online || device.status === 'online';
  const isActivated = device.activated;

  return (
    <Card hover className={`relative flex flex-col h-full ${density === 'compact' ? 'p-3 sm:p-4 gap-2 min-h-[150px]' : 'p-4 sm:p-5 gap-3 min-h-[180px]'}`}>
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center justify-center ${density === 'compact' ? 'w-10 h-10' : 'w-12 h-12'} rounded-lg ${isOnline ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>{getDeviceIcon(device.deviceType)}</div>
          <div className="min-w-0">
            <h3 className={`font-semibold text-gray-900 truncate ${density === 'compact' ? 'text-sm' : 'text-base'}`} title={device.name}>{device.name}</h3>
            <p className="text-xs text-gray-500 truncate">{getDeviceTypeLabel(device.deviceType)}{device.room ? ` • ${device.room}` : ''}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{isOnline ? 'Online' : 'Offline'}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${isActivated ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{isActivated ? 'Activated' : 'Pending'}</span>
        </div>
      </div>

      {/* Meta Grid */}
      <div className={`grid grid-cols-2 ${density === 'compact' ? 'gap-x-3 gap-y-1 text-[11px]' : 'gap-x-4 gap-y-2 text-xs'}`}>
        <div className="space-y-0.5">
          <p className="text-gray-500">ESP ID</p>
          <p className="font-mono text-gray-900 truncate" title={device.espId}>{device.espId}</p>
        </div>
        {device.lastSeen && (
          <div className="space-y-0.5">
            <p className="text-gray-500">Last Seen</p>
            <p className="text-gray-900 truncate" title={new Date(device.lastSeen).toLocaleString()}>{new Date(device.lastSeen).toLocaleTimeString()}</p>
          </div>
        )}
        {device.location && (
          <div className="space-y-0.5">
            <p className="text-gray-500">Location</p>
            <p className="text-gray-900 truncate" title={device.location}>{device.location}</p>
          </div>
        )}
        <div className="space-y-0.5">
          <p className="text-gray-500">Status</p>
          <p className={`font-medium ${device.status === 'online' ? 'text-green-600' : 'text-gray-600'}`}>{device.status || 'offline'}</p>
        </div>
      </div>

      {/* Actions Row */}
      <div className={`mt-auto flex items-center justify-between gap-2 ${density === 'compact' ? 'pt-0.5' : 'pt-1'}`}>      
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewQR}
          loading={loadingQR}
          className={`flex items-center gap-1 px-2 py-1 ${density === 'compact' ? 'text-[11px]' : 'text-xs'}`}
        >
          <QrCode className="w-4 h-4" /> QR
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/devices/${device._id || device.id}`)}
            className={`flex items-center gap-1 px-2 py-1 ${density === 'compact' ? 'text-[11px]' : 'text-xs'}`}
          >
            <Eye className="w-4 h-4" /> Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/devices/management')}
            className={`flex items-center gap-1 px-2 py-1 ${density === 'compact' ? 'text-[11px]' : 'text-xs'}`}
          >
            <Settings className="w-4 h-4" /> Manage
          </Button>
        </div>
      </div>

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
