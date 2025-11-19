import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { useWebSocketContext } from '../../context/WebSocketContext';
import { timeAgo, formatEnergy } from '../../utils/format';
import { Zap, QrCode, Eye } from 'lucide-react';
import { useUISettings } from '../../context/UISettingsContext';
import { Button } from '../ui/Button';

export const PlugCard = ({ device }) => {
  const { sendDeviceCommand, isConnected } = useWebSocketContext();
  const { density } = useUISettings();
  const [loading, setLoading] = useState(false);

  const isOn = device.isOn || device.status === 'on';
  const isOnline = device.status === 'online' || device.online !== false;
  const power = device.power || (isOn ? 150 : 0);

  const handleToggle = async (checked) => {
    setLoading(true);
    const command = checked ? 'turn_on' : 'turn_off';
    await sendDeviceCommand(device._id || device.id, command);
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <Card hover className={`relative flex flex-col h-full ${density === 'compact' ? 'p-3 sm:p-4 gap-2 min-h-[150px]' : 'p-4 sm:p-5 gap-3 min-h-[180px]'}`}>
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center justify-center ${density === 'compact' ? 'w-10 h-10' : 'w-12 h-12'} rounded-lg ${isOn ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
            <Zap className={density === 'compact' ? 'w-5 h-5' : 'w-6 h-6'} />
          </div>
          <div className="min-w-0">
            <h3 className={`font-semibold text-gray-900 truncate ${density === 'compact' ? 'text-sm' : 'text-base'}`} title={device.name || 'Smart Plug'}>
              {device.name || 'Smart Plug'}
            </h3>
            <p className="text-xs text-gray-500 truncate">Smart Plug{device.location ? ` • ${device.location}` : ''}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${isOn ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
            {isOn ? 'On' : 'Off'}
          </span>
        </div>
      </div>

      {/* Power Switch Row */}
      <div className="flex items-center justify-between px-1">
        <span className={`font-medium text-gray-700 ${density === 'compact' ? 'text-xs' : 'text-sm'}`}>Power</span>
        <Switch
          checked={isOn}
          onChange={handleToggle}
          disabled={!isOnline || !isConnected || loading}
        />
      </div>

      {/* Energy Consumption Badge */}
      {isOn && (
        <div className={`p-2 bg-blue-50 rounded-lg border border-blue-100 ${density === 'compact' ? 'py-1.5' : 'py-2'}`}>
          <div className="flex items-center justify-between">
            <span className={`font-medium text-blue-900 ${density === 'compact' ? 'text-[11px]' : 'text-xs'}`}>Current Usage</span>
            <span className={`font-bold text-blue-600 ${density === 'compact' ? 'text-sm' : 'text-base'}`}>{formatEnergy(power)}</span>
          </div>
        </div>
      )}

      {/* Meta Grid */}
      <div className={`grid grid-cols-2 ${density === 'compact' ? 'gap-x-3 gap-y-1 text-[11px]' : 'gap-x-4 gap-y-2 text-xs'} mt-auto`}>
        <div className="space-y-0.5">
          <p className="text-gray-500">Last Updated</p>
          <p className="text-gray-900 truncate" title={timeAgo(device.lastUpdated || device.updatedAt)}>
            {timeAgo(device.lastUpdated || device.updatedAt)}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-gray-500">Daily Usage</p>
          <p className="text-gray-900 font-medium">{device.dailyUsage || '2.4'} kWh</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-gray-500">Monthly Cost</p>
          <p className="text-gray-900 font-medium">${device.monthlyCost || '12.50'}</p>
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
