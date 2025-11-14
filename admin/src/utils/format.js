// Date formatting
export const formatDate = (date, includeTime = false) => {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return d.toLocaleDateString('en-US', options);
};

export const formatTime = (date) => {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const formatDateTime = (date) => {
  return formatDate(date, true);
};

export const timeAgo = (date) => {
  if (!date) return 'Never';
  
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'Just now';
};

// Number formatting
export const formatNumber = (number, decimals = 0) => {
  if (number === null || number === undefined) return 'N/A';
  return Number(number).toFixed(decimals);
};

export const formatPercentage = (value, total) => {
  if (!total || total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

export const formatEnergy = (watts) => {
  if (watts === null || watts === undefined) return 'N/A';
  
  if (watts >= 1000) {
    return `${(watts / 1000).toFixed(2)} kW`;
  }
  return `${watts.toFixed(0)} W`;
};

export const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Status formatting
export const formatStatus = (status) => {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

export const getStatusColor = (status) => {
  const colors = {
    online: 'text-green-600',
    offline: 'text-gray-400',
    active: 'text-blue-600',
    inactive: 'text-gray-400',
    locked: 'text-red-600',
    unlocked: 'text-green-600',
    on: 'text-green-600',
    off: 'text-gray-400',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    success: 'text-green-600',
  };
  
  return colors[status?.toLowerCase()] || 'text-gray-600';
};

export const getStatusBgColor = (status) => {
  const colors = {
    online: 'bg-green-100',
    offline: 'bg-gray-100',
    active: 'bg-blue-100',
    inactive: 'bg-gray-100',
    locked: 'bg-red-100',
    unlocked: 'bg-green-100',
    on: 'bg-green-100',
    off: 'bg-gray-100',
    warning: 'bg-yellow-100',
    error: 'bg-red-100',
    success: 'bg-green-100',
  };
  
  return colors[status?.toLowerCase()] || 'bg-gray-100';
};

// Device type formatting
export const getDeviceIcon = (deviceType) => {
  const icons = {
    door_lock: '🔒',
    light: '💡',
    plug: '🔌',
    motion: '👁️',
    camera: '📹',
    thermostat: '🌡️',
    sensor: '📡',
  };
  
  return icons[deviceType] || '📱';
};

export const getDeviceTypeName = (deviceType) => {
  const names = {
    door_lock: 'Door Lock',
    light: 'Smart Light',
    plug: 'Smart Plug',
    motion: 'Motion Sensor',
    camera: 'Camera',
    thermostat: 'Thermostat',
    sensor: 'Sensor',
  };
  
  return names[deviceType] || 'Device';
};

// Truncate text
export const truncate = (text, length = 50) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return `${text.substring(0, length)}...`;
};

// Capitalize
export const capitalize = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};
