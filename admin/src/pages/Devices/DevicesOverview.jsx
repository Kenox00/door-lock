import React, { useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useDevices } from '../../hooks/useDevices';
import { UniversalDeviceCard } from '../../components/devices/UniversalDeviceCard';
import { AddDeviceModal } from '../../components/devices/AddDeviceModal';

export const DevicesOverview = () => {
  const { devices, loading, fetchDevices } = useDevices();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const deviceTypes = [
    { id: 'all', label: 'All Devices', count: devices.length },
    { id: 'door-lock', label: 'Door Locks', count: devices.filter(d => d.deviceType === 'door-lock').length },
    { id: 'esp32-cam', label: 'Cameras', count: devices.filter(d => d.deviceType === 'esp32-cam').length },
    { id: 'motion-sensor', label: 'Motion Sensors', count: devices.filter(d => d.deviceType === 'motion-sensor').length },
    { id: 'other', label: 'Other', count: devices.filter(d => d.deviceType === 'other').length },
  ];

  const filteredDevices = devices.filter(device => {
    const matchesFilter = filter === 'all' || device.deviceType === filter;
    const matchesSearch = !searchQuery || 
      device.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.room?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.espId?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600">Loading devices...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
            <p className="text-gray-500 mt-1">Manage and control all your smart devices</p>
          </div>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Device
          </Button>
        </div>

        {/* Search Bar */}
        <Card>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search devices by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>
        </Card>

        {/* Filter Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {deviceTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setFilter(type.id)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
                ${filter === type.id
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }
              `}
            >
              {type.label} ({type.count})
            </button>
          ))}
        </div>

        {/* Devices Grid */}
        {filteredDevices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 auto-rows-fr">
            {filteredDevices.map(device => (
              <UniversalDeviceCard key={device._id || device.id} device={device} />
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No devices found</h3>
              <p className="text-gray-500 mb-4">Try adjusting your search or filter to find what you're looking for.</p>
              <Button variant="primary" onClick={() => { setFilter('all'); setSearchQuery(''); }}>
                Clear Filters
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Add Device Modal */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDeviceAdded={() => {
          fetchDevices();
        }}
      />
    </DashboardLayout>
  );
};
