import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { X, Copy, Check } from 'lucide-react';

export const QRCodeModal = ({ isOpen, onClose, qrData }) => {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // allow next paint to apply transition classes
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen || !qrData) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrData.onboardingURL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrData.qrCode;
    link.download = `${qrData.deviceName}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-white/10 backdrop-blur-md transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />
      <div className={`relative bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md mx-auto overflow-hidden max-h-[85vh] flex flex-col transition-all duration-300 ease-out ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-blue-700 px-4 sm:px-5 py-3.5 flex items-center justify-between">            
          <div>
            <h2 className="text-xl font-bold text-white">Device QR Code</h2>
            <p className="text-blue-100 text-sm">{qrData.deviceName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto">
          {/* Device Info */}
          <div className="mb-4 sm:mb-5 bg-gray-50 rounded-lg p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Device Type:</span>
                <p className="font-semibold text-gray-900 capitalize">
                  {qrData.deviceType.replace('-', ' ')}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Room:</span>
                <p className="font-semibold text-gray-900">
                  {qrData.room || 'Not specified'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <p className={`font-semibold ${qrData.activated ? 'text-green-600' : 'text-orange-600'}`}>
                  {qrData.activated ? 'Activated' : 'Pending Activation'}
                </p>
              </div>
              {qrData.activatedAt && (
                <div>
                  <span className="text-gray-600">Activated:</span>
                  <p className="font-semibold text-gray-900">
                    {new Date(qrData.activatedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-4 sm:mb-5">
            <div className="bg-white p-2 sm:p-3 rounded-xl shadow-lg border border-gray-200">
              <img
                src={qrData.qrCode}
                alt="Device QR Code"
                className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-4 sm:mb-5 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm">
              📱 Setup Instructions
            </h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Scan this QR code with your device</li>
              <li>Or copy the link below and open it on your device</li>
              <li>The device will be automatically configured</li>
              <li>Wait for activation confirmation</li>
            </ol>
          </div>

          {/* Onboarding URL */}
          <div className="mb-4 sm:mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Onboarding Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={qrData.onboardingURL}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700 font-mono"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Button
              onClick={handleDownloadQR}
              variant="secondary"
              className="flex-1"
            >
              Download QR Code
            </Button>
            <Button onClick={onClose} className="flex-1">
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
