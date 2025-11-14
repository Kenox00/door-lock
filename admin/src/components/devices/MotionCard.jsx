import React from 'react';
import { Card } from '../ui/Card';
import { timeAgo } from '../../utils/format';

export const MotionCard = ({ device }) => {
  const isActive = device.status === 'active' || device.motionDetected;
  const isOnline = device.online !== false;
  const lastDetection = device.lastMotion || device.lastUpdated;

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
        isActive ? 'bg-green-100 animate-pulse' : 'bg-gray-100'
      }`}>
        <svg className={`w-8 h-8 ${isActive ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      </div>

      {/* Device Info */}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {device.name || 'Motion Sensor'}
      </h3>
      <p className="text-sm text-gray-500 mb-4">{device.location || 'Hallway'}</p>

      {/* Status Badge */}
      <div className="flex items-center justify-center mb-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${
            isActive
              ? 'bg-green-100 text-green-700 border-green-300 animate-pulse'
              : 'bg-gray-100 text-gray-700 border-gray-300'
          }`}
        >
          {isActive ? 'Motion Detected' : 'No Motion'}
        </span>
      </div>

      {/* Last Detection */}
      {isActive && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-green-900">Motion Active</span>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Status:</span>
          <span className={`font-medium ${isActive ? 'text-green-600' : 'text-gray-600'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Last Detection:</span>
          <span className="text-gray-900 font-medium">
            {lastDetection ? timeAgo(lastDetection) : 'Never'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Sensitivity:</span>
          <span className="text-gray-900 font-medium">
            {device.sensitivity || 'Medium'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Today's Events:</span>
          <span className="text-gray-900 font-medium">
            {device.todayEvents || 12}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
        <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          View History
        </button>
        <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          Settings
        </button>
      </div>
    </Card>
  );
};
