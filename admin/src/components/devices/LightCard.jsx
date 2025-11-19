import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { useWebSocketContext } from '../../context/WebSocketContext';
import { timeAgo } from '../../utils/format';
import { Lightbulb, QrCode, Eye } from 'lucide-react';
import { useUISettings } from '../../context/UISettingsContext';
import { Button } from '../ui/Button';

export const LightCard = ({ device }) => {
  const { sendDeviceCommand, isConnected } = useWebSocketContext();
  const { density } = useUISettings();
  const [loading, setLoading] = useState(false);
  const [brightness, setBrightnessLocal] = useState(device.brightness || 100);

  const isOn = device.isOn || device.status === 'on';
  const isOnline = device.status === 'online' || device.online !== false;

  // Update local brightness when device prop changes
  useEffect(() => {
    setBrightnessLocal(device.brightness || 100);
  }, [device.brightness]);

  const handleToggle = async (checked) => {
    setLoading(true);
    const command = checked ? 'turn_on' : 'turn_off';
    await sendDeviceCommand(device._id || device.id, command);
    setTimeout(() => setLoading(false), 1000);
  };

  const handleBrightnessChange = async (e) => {
    const newBrightness = parseInt(e.target.value);
    setBrightnessLocal(newBrightness);
  };

  const handleBrightnessRelease = async (e) => {
    const newBrightness = parseInt(e.target.value);
    await sendDeviceCommand(device._id || device.id, 'set_brightness', { 
      brightness: newBrightness 
    });
  };

  return (
    <Card hover className={`relative flex flex-col h-full ${density === 'compact' ? 'p-3 sm:p-4 gap-2 min-h-[150px]' : 'p-4 sm:p-5 gap-3 min-h-[180px]'}`}>
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center justify-center ${density === 'compact' ? 'w-10 h-10' : 'w-12 h-12'} rounded-lg ${isOn ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'}`}>
            <Lightbulb className={density === 'compact' ? 'w-5 h-5' : 'w-6 h-6'} />
          </div>
          <div className="min-w-0">
            <h3 className={`font-semibold text-gray-900 truncate ${density === 'compact' ? 'text-sm' : 'text-base'}`} title={device.name || 'Smart Light'}>
              {device.name || 'Smart Light'}
            </h3>
            <p className="text-xs text-gray-500 truncate">Smart Light{device.location ? ` • ${device.location}` : ''}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${isOn ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
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

      {/* Brightness Control */}
      {isOn && (
        <div className="px-1">
          <div className="flex justify-between items-center mb-2">
            <span className={`font-medium text-gray-700 ${density === 'compact' ? 'text-xs' : 'text-sm'}`}>Brightness</span>
            <span className={`text-gray-900 font-semibold ${density === 'compact' ? 'text-xs' : 'text-sm'}`}>{brightness}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={brightness}
            onChange={handleBrightnessChange}
            onMouseUp={handleBrightnessRelease}
            onTouchEnd={handleBrightnessRelease}
            disabled={!isOnline}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          />
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
          <p className="text-gray-500">Energy</p>
          <p className="text-gray-900 font-medium">{device.power || (isOn ? Math.round(brightness / 10) : 0)} W</p>
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
