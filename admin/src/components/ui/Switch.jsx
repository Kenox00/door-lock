import React from 'react';

export const Switch = ({ 
  checked = false, 
  onChange, 
  disabled = false,
  size = 'md',
  label,
  className = '',
  ...props 
}) => {
  const sizes = {
    sm: {
      track: 'w-8 h-5',
      thumb: 'w-4 h-4',
      translate: 'translate-x-3',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translate: 'translate-x-7',
    },
  };

  const sizeConfig = sizes[size];

  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`
          relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
          ${sizeConfig.track}
          ${checked ? 'bg-green-600' : 'bg-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        {...props}
      >
        <span
          className={`
            inline-block rounded-full bg-white shadow-lg transform transition-transform duration-200 ease-in-out
            ${sizeConfig.thumb}
            ${checked ? sizeConfig.translate : 'translate-x-1'}
          `}
        />
      </button>
      {label && (
        <span 
          className={`ml-3 text-sm font-medium text-gray-700 ${disabled ? 'opacity-50' : ''}`}
        >
          {label}
        </span>
      )}
    </div>
  );
};
