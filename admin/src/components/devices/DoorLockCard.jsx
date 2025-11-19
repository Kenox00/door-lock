import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { QRCodeModal } from './QRCodeModal';
import { useWebSocketContext } from '../../context/WebSocketContext';
import { devicesApi } from '../../api/devicesApi';
import { timeAgo } from '../../utils/format';
import { QrCode, Eye, Lock, Unlock } from 'lucide-react';
import { useUISettings } from '../../context/UISettingsContext';

export const DoorLockCard = ({ device }) => {
  const navigate = useNavigate();
  const { sendDeviceCommand, isConnected } = useWebSocketContext();
  const { density } = useUISettings();
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
    <Card hover className={`relative flex flex-col h-full ${density === 'compact' ? 'p-3 sm:p-4 gap-2 min-h-[150px]' : 'p-4 sm:p-5 gap-3 min-h-[180px]'}`}>
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center justify-center ${density === 'compact' ? 'w-10 h-10' : 'w-12 h-12'} rounded-lg ${isLocked ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-600'}`}>
            {isLocked ? (
              <Lock className={density === 'compact' ? 'w-5 h-5' : 'w-6 h-6'} />
            ) : (
              <Unlock className={density === 'compact' ? 'w-5 h-5' : 'w-6 h-6'} />
            )}
          </div>
          <div className="min-w-0">
            <h3 className={`font-semibold text-gray-900 truncate ${density === 'compact' ? 'text-sm' : 'text-base'}`} title={device.name || 'Door Lock'}>
              {device.name || 'Door Lock'}
            </h3>
            <p className="text-xs text-gray-500 truncate">Door Lock{device.location ? ` • ${device.location}` : ''}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${isLocked ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
            {isLocked ? 'Locked' : 'Unlocked'}
          </span>
        </div>
      </div>

      {/* Meta Grid */}
      <div className={`grid grid-cols-2 ${density === 'compact' ? 'gap-x-3 gap-y-1 text-[11px]' : 'gap-x-4 gap-y-2 text-xs'}`}>
        <div className="space-y-0.5">
          <p className="text-gray-500">Last Activity</p>
          <p className="text-gray-900 truncate" title={timeAgo(device.lastUpdated || device.updatedAt)}>
            {timeAgo(device.lastUpdated || device.updatedAt)}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-gray-500">Battery</p>
          <p className="text-gray-900 font-medium">{device.battery || 95}%</p>
        </div>
        {device.location && (
          <div className="space-y-0.5 col-span-2">
            <p className="text-gray-500">Location</p>
            <p className="text-gray-900 truncate" title={device.location}>{device.location}</p>
          </div>
        )}
      </div>

      {/* Lock/Unlock Button */}
      <div className={`${density === 'compact' ? 'mt-1' : 'mt-2'}`}>
        <Button
          variant={isLocked ? 'success' : 'danger'}
          fullWidth
          loading={loading}
          disabled={!isOnline || !isConnected}
          onClick={handleToggleLock}
          className={`flex items-center justify-center gap-2 ${density === 'compact' ? 'text-xs py-1.5' : 'text-sm py-2'}`}
        >
          {isLocked ? (
            <>
              <Unlock className="w-4 h-4" />
              Unlock Door
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Lock Door
            </>
          )}
        </Button>
      </div>

      {/* Actions Row */}
      <div className={`mt-auto flex items-center gap-2 ${density === 'compact' ? 'pt-0.5' : 'pt-1'}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewQR}
          loading={loadingQR}
          className={`flex items-center gap-1 px-2 py-1 ${density === 'compact' ? 'text-[11px]' : 'text-xs'}`}
        >
          <QrCode className="w-4 h-4" /> QR
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/devices/${device._id || device.id}`)}
          className={`flex items-center gap-1 px-2 py-1 ${density === 'compact' ? 'text-[11px]' : 'text-xs'}`}
        >
          <Eye className="w-4 h-4" /> Details
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
