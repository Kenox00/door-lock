import React, { createContext, useContext, useState, useEffect } from 'react';

const UISettingsContext = createContext(null);

export const UISettingsProvider = ({ children }) => {
  const [density, setDensity] = useState('comfort'); // 'comfort' | 'compact'

  useEffect(() => {
    const stored = localStorage.getItem('ui_density');
    if (stored === 'compact' || stored === 'comfort') {
      setDensity(stored);
    }
  }, []);

  const toggleDensity = () => {
    setDensity(prev => {
      const next = prev === 'compact' ? 'comfort' : 'compact';
      localStorage.setItem('ui_density', next);
      return next;
    });
  };

  return (
    <UISettingsContext.Provider value={{ density, toggleDensity }}>
      {children}
    </UISettingsContext.Provider>
  );
};

export const useUISettings = () => {
  const ctx = useContext(UISettingsContext);
  if (!ctx) throw new Error('useUISettings must be used within UISettingsProvider');
  return ctx;
};
