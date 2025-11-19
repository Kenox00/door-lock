import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { devicesApi } from '../../api/devicesApi';
import { QRCodeModal } from './QRCodeModal';

export const AddDeviceModal = ({ isOpen, onClose, onDeviceAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    espId: '',
    deviceType: 'door-lock',
    location: '',
    room: '',
    firmwareVersion: '1.0.0',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const deviceTypes = [
    { value: 'door-lock', label: 'Door Lock' },
    { value: 'esp32-cam', label: 'ESP32 Camera' },
    { value: 'motion-sensor', label: 'Motion Sensor' },
    { value: 'other', label: 'Other' },
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);
    try {
      const response = await devicesApi.registerDevice(formData);
      if (response.data) {
        setSuccess({
          deviceId: response.data.id,
            espId: response.data.espId,
            deviceToken: response.data.deviceToken,
            name: response.data.name,
        });
        if (response.data.qrCode && response.data.onboardingURL) {
          setQrData({
            deviceId: response.data.id,
            deviceName: response.data.name,
            deviceType: response.data.deviceType,
            room: response.data.room,
            qrCode: response.data.qrCode,
            onboardingURL: response.data.onboardingURL,
            activated: response.data.activated,
            activatedAt: response.data.activatedAt,
          });
        }
        if (onDeviceAdded) onDeviceAdded(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to add device');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setFormData({
      name: '', espId: '', deviceType: 'door-lock', location: '', room: '', firmwareVersion: '1.0.0',
    });
    setError('');
    setSuccess(null);
    setQrData(null);
    setShowQRModal(false);
    onClose();
  };

  const handleShowQR = () => setShowQRModal(true);
  const copyToClipboard = (text) => navigator.clipboard.writeText(text);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className={`absolute inset-0 bg-white/10 backdrop-blur-md transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className={`relative w-full max-w-md sm:max-w-lg bg-white rounded-xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col transition-all duration-300 ease-out ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        {/* Header */}
        <div className="bg-white px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="ml-3 text-xl font-semibold text-gray-900">
                {success ? 'Device Added Successfully!' : 'Add New Device'}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none rounded-md p-1"
              disabled={loading}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {success ? (
          <>
            <div className="bg-white px-5 sm:px-6 py-5 overflow-y-auto">
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="shrink-0">
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">Device "{success.name}" has been registered successfully!</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 font-medium">Please save these credentials for your ESP32 device:</p>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">DEVICE ID</label>
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono text-gray-900 break-all">{success.deviceId}</code>
                      <button onClick={() => copyToClipboard(success.deviceId)} className="ml-2 p-1 text-gray-500 hover:text-gray-700" title="Copy">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">ESP ID</label>
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono text-gray-900 break-all">{success.espId}</code>
                      <button onClick={() => copyToClipboard(success.espId)} className="ml-2 p-1 text-gray-500 hover:text-gray-700" title="Copy">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <label className="block text-xs font-semibold text-yellow-800 mb-1">DEVICE TOKEN (Save this!)</label>
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono text-yellow-900 break-all">{success.deviceToken}</code>
                      <button onClick={() => copyToClipboard(success.deviceToken)} className="ml-2 p-1 text-yellow-600 hover:text-yellow-800" title="Copy">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex">
                    <div className="shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    </div>
                    <p className="ml-3 text-sm text-blue-800">Configure your ESP32 device with these credentials.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 sm:px-6 py-4 flex flex-col sm:flex-row justify-end gap-3">
              {qrData && (
                <Button type="button" variant="secondary" onClick={handleShowQR}>View QR Code</Button>
              )}
              <Button type="button" variant="primary" onClick={handleClose}>Done</Button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="bg-white px-5 sm:px-6 py-5 space-y-4 overflow-y-auto">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  <p className="ml-3 text-sm text-red-800">{error}</p>
                </div>
              )}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Device Name *</label>
                <input id="name" name="name" required maxLength={50} value={formData.name} onChange={handleChange} placeholder="e.g., Front Door Lock" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label htmlFor="espId" className="block text-sm font-medium text-gray-700 mb-1">ESP32 ID *</label>
                <input id="espId" name="espId" required value={formData.espId} onChange={handleChange} placeholder="e.g., ESP32-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none uppercase" style={{ textTransform: 'uppercase' }} />
                <p className="mt-1 text-xs text-gray-500">Unique identifier for your ESP32 device</p>
              </div>
              <div>
                <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700 mb-1">Device Type *</label>
                <select id="deviceType" name="deviceType" required value={formData.deviceType} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none">
                  {deviceTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="room" className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                <input id="room" name="room" value={formData.room} onChange={handleChange} maxLength={100} placeholder="e.g., Living Room" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location (Optional)</label>
                <input id="location" name="location" value={formData.location} onChange={handleChange} maxLength={100} placeholder="e.g., Main Entrance" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label htmlFor="firmwareVersion" className="block text-sm font-medium text-gray-700 mb-1">Firmware Version</label>
                <input id="firmwareVersion" name="firmwareVersion" value={formData.firmwareVersion} onChange={handleChange} placeholder="e.g., 1.0.0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
              </div>
            </div>
            <div className="bg-gray-50 px-5 sm:px-6 py-4 flex flex-col sm:flex-row justify-end gap-3">
              <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
              <Button type="submit" variant="primary" loading={loading}>Add Device</Button>
            </div>
          </form>
        )}
      </div>
      {qrData && (
        <QRCodeModal isOpen={showQRModal} onClose={() => setShowQRModal(false)} qrData={qrData} />
      )}
    </div>
  );
};
