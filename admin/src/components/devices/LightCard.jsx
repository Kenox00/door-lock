import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { useWebSocketContext } from '../../context/WebSocketContext';
import { timeAgo } from '../../utils/format';

export const LightCard = ({ device }) => {
  const { sendDeviceCommand, isConnected } = useWebSocketContext();
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
        isOn ? 'bg-green-100' : 'bg-gray-100'
      }`}>
        <svg className={`w-8 h-8 ${isOn ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>

      {/* Device Info */}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {device.name || 'Smart Light'}
      </h3>
      <p className="text-sm text-gray-500 mb-4">{device.location || 'Living Room'}</p>

      {/* Power Switch */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">Power</span>
        <Switch
          checked={isOn}
          onChange={handleToggle}
          disabled={!isOnline || !isConnected || loading}
        />
      </div>

      {/* Brightness Control */}
      {isOn && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Brightness</span>
            <span className="text-sm text-gray-900 font-semibold">{brightness}%</span>
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
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
        </div>
      )}

      {/* Additional Info */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Status:</span>
          <span className={`font-medium ${isOn ? 'text-green-600' : 'text-gray-600'}`}>
            {isOn ? 'On' : 'Off'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Last Updated:</span>
          <span className="text-gray-900 font-medium">
            {timeAgo(device.lastUpdated || device.updatedAt)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Energy:</span>
          <span className="text-gray-900 font-medium">
            {device.power || (isOn ? brightness / 10 : 0)} W
          </span>
        </div>
      </div>
    </Card>
  );
};
