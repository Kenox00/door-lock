import React from 'react';
import { Card } from '../ui/Card';
import { timeAgo } from '../../utils/format';
import { Radar, QrCode, Eye } from 'lucide-react';
import { useUISettings } from '../../context/UISettingsContext';
import { Button } from '../ui/Button';

export const MotionCard = ({ device }) => {
  const { density } = useUISettings();
  const isActive = device.status === 'active' || device.motionDetected;
  const isOnline = device.online !== false;
  const lastDetection = device.lastMotion || device.lastUpdated;

  return (
    <Card hover className={`relative flex flex-col h-full ${density === 'compact' ? 'p-3 sm:p-4 gap-2 min-h-[150px]' : 'p-4 sm:p-5 gap-3 min-h-[180px]'}`}>
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center justify-center ${density === 'compact' ? 'w-10 h-10' : 'w-12 h-12'} rounded-lg ${isActive ? 'bg-purple-100 text-purple-600 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
            <Radar className={density === 'compact' ? 'w-5 h-5' : 'w-6 h-6'} />
          </div>
          <div className="min-w-0">
            <h3 className={`font-semibold text-gray-900 truncate ${density === 'compact' ? 'text-sm' : 'text-base'}`} title={device.name || 'Motion Sensor'}>
              {device.name || 'Motion Sensor'}
            </h3>
            <p className="text-xs text-gray-500 truncate">Motion Sensor{device.location ? ` • ${device.location}` : ''}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${isActive ? 'bg-purple-100 text-purple-700 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Active Motion Alert */}
      {isActive && (
        <div className={`p-2 bg-purple-50 rounded-lg border border-purple-100 ${density === 'compact' ? 'py-1.5' : 'py-2'}`}>
          <div className="flex items-center justify-center gap-2">
            <Radar className="w-4 h-4 text-purple-600 animate-pulse" />
            <span className={`font-medium text-purple-900 ${density === 'compact' ? 'text-[11px]' : 'text-xs'}`}>Motion Detected</span>
          </div>
        </div>
      )}

      {/* Meta Grid */}
      <div className={`grid grid-cols-2 ${density === 'compact' ? 'gap-x-3 gap-y-1 text-[11px]' : 'gap-x-4 gap-y-2 text-xs'} mt-auto`}>
        <div className="space-y-0.5">
          <p className="text-gray-500">Last Detection</p>
          <p className="text-gray-900 truncate" title={lastDetection ? timeAgo(lastDetection) : 'Never'}>
            {lastDetection ? timeAgo(lastDetection) : 'Never'}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-gray-500">Sensitivity</p>
          <p className="text-gray-900 font-medium">{device.sensitivity || 'Medium'}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-gray-500">Today's Events</p>
          <p className="text-gray-900 font-medium">{device.todayEvents || 12}</p>
        </div>
      </div>

      {/* Actions Row */}
      <div className={`flex items-center gap-2 ${density === 'compact' ? 'pt-0.5' : 'pt-1'}`}>
        <Button
          variant="outline"
          size="sm"
          className={`flex items-center gap-1 px-2 py-1 ${density === 'compact' ? 'text-[11px]' : 'text-xs'}`}
        >
          <QrCode className="w-4 h-4" /> QR
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className={`flex items-center gap-1 px-2 py-1 ${density === 'compact' ? 'text-[11px]' : 'text-xs'}`}
        >
          <Eye className="w-4 h-4" /> Details
        </Button>
      </div>
    </Card>
  );
};
