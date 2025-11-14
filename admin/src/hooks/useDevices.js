import { useContext } from 'react';
import { DevicesContext } from '../context/DevicesContext';

export const useDevices = () => {
  const context = useContext(DevicesContext);
  
  if (!context) {
    throw new Error('useDevices must be used within a DevicesProvider');
  }
  
  return context;
};
