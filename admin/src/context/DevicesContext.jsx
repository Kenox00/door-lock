import React, { createContext, useState, useEffect, useCallback } from 'react';
import { devicesApi } from '../api/devicesApi';

export const DevicesContext = createContext(null);

export const DevicesProvider = ({ children }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDevices = useCallback(async () => {
    try {
      const response = await devicesApi.getAllDevices();
      if (response.data) {
        // Normalize device data to ensure consistent field names
        const normalizedDevices = response.data.map(device => ({
          ...device,
          type: device.deviceType || device.type, // Normalize type field
          online: device.status === 'online', // Add online boolean for compatibility
          id: device._id || device.id // Ensure id field exists
        }));
        setDevices(normalizedDevices);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError(err.message || 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Removed HTTP polling - using WebSocket real-time updates instead

  const updateDeviceState = (deviceId, updates) => {
    setDevices(prevDevices =>
      prevDevices.map(device =>
        device.id === deviceId || device._id === deviceId
          ? { ...device, ...updates }
          : device
      )
    );
  };

  const turnOn = async (deviceId) => {
    try {
      updateDeviceState(deviceId, { status: 'on', loading: true });
      const response = await devicesApi.turnOn(deviceId);
      updateDeviceState(deviceId, { 
        status: 'on', 
        loading: false,
        lastUpdated: new Date().toISOString()
      });
      return { success: true, data: response };
    } catch (error) {
      updateDeviceState(deviceId, { loading: false });
      console.error('Error turning on device:', error);
      return { success: false, error: error.message };
    }
  };

  const turnOff = async (deviceId) => {
    try {
      updateDeviceState(deviceId, { status: 'off', loading: true });
      const response = await devicesApi.turnOff(deviceId);
      updateDeviceState(deviceId, { 
        status: 'off', 
        loading: false,
        lastUpdated: new Date().toISOString()
      });
      return { success: true, data: response };
    } catch (error) {
      updateDeviceState(deviceId, { loading: false });
      console.error('Error turning off device:', error);
      return { success: false, error: error.message };
    }
  };

  const setBrightness = async (deviceId, brightness) => {
    try {
      updateDeviceState(deviceId, { brightness, loading: true });
      const response = await devicesApi.setBrightness(deviceId, brightness);
      updateDeviceState(deviceId, { 
        brightness, 
        loading: false,
        lastUpdated: new Date().toISOString()
      });
      return { success: true, data: response };
    } catch (error) {
      updateDeviceState(deviceId, { loading: false });
      console.error('Error setting brightness:', error);
      return { success: false, error: error.message };
    }
  };

  const lockDoor = async (deviceId) => {
    try {
      updateDeviceState(deviceId, { locked: true, loading: true });
      const response = await devicesApi.lockDoor(deviceId);
      updateDeviceState(deviceId, { 
        locked: true, 
        status: 'locked',
        loading: false,
        lastUpdated: new Date().toISOString()
      });
      return { success: true, data: response };
    } catch (error) {
      updateDeviceState(deviceId, { loading: false });
      console.error('Error locking door:', error);
      return { success: false, error: error.message };
    }
  };

  const unlockDoor = async (deviceId) => {
    try {
      updateDeviceState(deviceId, { locked: false, loading: true });
      const response = await devicesApi.unlockDoor(deviceId);
      updateDeviceState(deviceId, { 
        locked: false, 
        status: 'unlocked',
        loading: false,
        lastUpdated: new Date().toISOString()
      });
      return { success: true, data: response };
    } catch (error) {
      updateDeviceState(deviceId, { loading: false });
      console.error('Error unlocking door:', error);
      return { success: false, error: error.message };
    }
  };

  const getDevicesByType = (type) => {
    return devices.filter(device => device.type === type);
  };

  const getDeviceById = (deviceId) => {
    return devices.find(device => 
      device.id === deviceId || device._id === deviceId
    );
  };

  const getActiveDevices = () => {
    return devices.filter(device => 
      device.status === 'on' || device.status === 'active' || device.status === 'unlocked'
    );
  };

  const getOnlineDevices = () => {
    return devices.filter(device => device.online === true || device.status === 'online');
  };

  const value = {
    devices,
    loading,
    error,
    refreshDevices: fetchDevices, // Alias for clarity in WebSocket context
    fetchDevices,
    updateDeviceState,
    turnOn,
    turnOff,
    setBrightness,
    lockDoor,
    unlockDoor,
    getDevicesByType,
    getDeviceById,
    getActiveDevices,
    getOnlineDevices,
  };

  return <DevicesContext.Provider value={value}>{children}</DevicesContext.Provider>;
};
