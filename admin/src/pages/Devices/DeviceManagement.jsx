import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AddDeviceModal } from '../../components/devices/AddDeviceModal';
import { QRCodeModal } from '../../components/devices/QRCodeModal';
import { devicesApi } from '../../api/devicesApi';
import { QrCode, Power, Circle, Wifi, WifiOff } from 'lucide-react';

export const DeviceManagement = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedQRDevice, setSelectedQRDevice] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await devicesApi.getAllDevices();
      setDevices(response.data || []);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewQR = async (device) => {
    try {
      const response = await devicesApi.getDeviceQR(device._id);
      if (response.data) {
        setSelectedQRDevice(response.data);
        setShowQRModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch QR code:', error);
      alert('Failed to generate QR code');
    }
  };

  const getDeviceTypeLabel = (type) => {
    const types = {
      'door-lock': 'Door Lock',
      'esp32-cam': 'ESP32 Camera',
      'motion-sensor': 'Motion Sensor',
      'other': 'Other'
    };
    return types[type] || type;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-100';
      case 'offline':
        return 'text-gray-600 bg-gray-100';
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredDevices = devices.filter(device => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      device.name?.toLowerCase().includes(query) ||
      device.espId?.toLowerCase().includes(query) ||
      device.room?.toLowerCase().includes(query) ||
      device.deviceType?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
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
            <h1 className="text-3xl font-bold text-gray-900">Device Management</h1>
            <p className="text-gray-500 mt-1">Manage IoT devices and QR onboarding</p>
          </div>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Device
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Devices</p>
                <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Power className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Online</p>
                <p className="text-2xl font-bold text-green-600">
                  {devices.filter(d => d.online).length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Wifi className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Offline</p>
                <p className="text-2xl font-bold text-gray-600">
                  {devices.filter(d => !d.online).length}
                </p>
              </div>
              <div className="bg-gray-100 p-3 rounded-full">
                <WifiOff className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activated</p>
                <p className="text-2xl font-bold text-blue-600">
                  {devices.filter(d => d.activated).length}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Circle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <Card>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, ESP ID, room, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </Card>

        {/* Devices Table */}
        <Card>
          {filteredDevices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Room
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Activated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Connection
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Last Seen
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDevices.map((device) => (
                    <tr key={device._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {device.name}
                          </div>
                          <div className="text-sm text-gray-500 font-mono">
                            {device.espId}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {getDeviceTypeLabel(device.deviceType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {device.room || device.location || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(device.status)}`}>
                          {device.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {device.activated ? (
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                            <span className="text-sm text-green-700">Yes</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                            <span className="text-sm text-orange-700">Pending</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {device.online ? (
                          <div className="flex items-center text-green-600">
                            <Wifi className="w-4 h-4 mr-1" />
                            <span className="text-sm">Online</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-500">
                            <WifiOff className="w-4 h-4 mr-1" />
                            <span className="text-sm">Offline</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewQR(device)}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                          title="View QR Code"
                        >
                          <QrCode className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No devices found</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first IoT device.</p>
              <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
                Add Device
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Add Device Modal */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDeviceAdded={() => {
          fetchDevices();
          setIsAddModalOpen(false);
        }}
      />

      {/* QR Code Modal */}
      {selectedQRDevice && (
        <QRCodeModal
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedQRDevice(null);
          }}
          qrData={selectedQRDevice}
        />
      )}
    </DashboardLayout>
  );
};
