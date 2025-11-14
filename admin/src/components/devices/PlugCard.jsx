import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { useWebSocketContext } from '../../context/WebSocketContext';
import { timeAgo, formatEnergy } from '../../utils/format';

export const PlugCard = ({ device }) => {
  const { sendDeviceCommand, isConnected } = useWebSocketContext();
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
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>

      {/* Device Info */}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {device.name || 'Smart Plug'}
      </h3>
      <p className="text-sm text-gray-500 mb-4">{device.location || 'Kitchen'}</p>

      {/* Power Switch */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">Power</span>
        <Switch
          checked={isOn}
          onChange={handleToggle}
          disabled={!isOnline || !isConnected || loading}
        />
      </div>

      {/* Energy Consumption */}
      {isOn && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-900">Current Usage</span>
            <span className="text-lg font-bold text-green-600">{formatEnergy(power)}</span>
          </div>
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
          <span className="text-gray-500">Today's Usage:</span>
          <span className="text-gray-900 font-medium">
            {device.dailyUsage || '2.4'} kWh
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Monthly Cost:</span>
          <span className="text-gray-900 font-medium">
            ${device.monthlyCost || '12.50'}
          </span>
        </div>
      </div>
    </Card>
  );
};
