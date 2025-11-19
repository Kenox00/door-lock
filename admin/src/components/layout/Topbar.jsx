import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import ConnectionStatus from '../ui/ConnectionStatus';
import { useUISettings } from '../../context/UISettingsContext';
import { menuItems } from './Sidebar';
import { NotificationDropdown } from '../ui/NotificationDropdown';
import { VisitorApprovalModal } from '../ui/VisitorApprovalModal';
import { dashboardApi } from '../../api/dashboardApi';

export const Topbar = () => {
  const { user, logout } = useAuth();
  const { density, toggleDensity } = useUISettings();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const notification = useNotification();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  const handleLogout = async () => {
    await logout();
  };

  const handleNotificationClick = (notif) => {
    notification.markNotificationAsRead(notif.id);
    setSelectedVisitor({
      id: notif.id,
      visitorId: notif.visitorId,
      imageUrl: notif.imageUrl,
      deviceId: notif.deviceId,
      deviceName: notif.deviceName,
      timestamp: notif.timestamp,
      status: notif.status,
    });
    setShowNotifications(false);
  };

  const handleApprove = async (visitorId, note) => {
    // Call REST API endpoint to grant access
    await dashboardApi.approveVisitor(visitorId, note);
    notification.success('Access granted successfully');
  };

  const handleReject = async (visitorId, reason) => {
    // Call REST API endpoint to deny access
    await dashboardApi.denyVisitor(visitorId, reason);
    notification.success('Access denied successfully');
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 h-14 md:h-16 flex items-center justify-between px-4 sm:px-6 relative">
      {/* Left Section */}
      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          aria-label="Open navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <h2 className="hidden xs:block text-lg md:text-xl font-semibold text-gray-900 truncate">Dashboard</h2>
        <ConnectionStatus />
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-500 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notification.unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                {notification.unreadCount > 9 ? '9+' : notification.unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationDropdown
              notifications={notification.visitorNotifications}
              onClose={() => setShowNotifications(false)}
              onNotificationClick={handleNotificationClick}
            />
          )}
        </div>

        {/* Settings */}
        <button
          onClick={toggleDensity}
          className="p-2 text-gray-500 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors hidden sm:inline-flex"
          aria-label="Toggle density"
        >
          {density === 'compact' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M8 10h8M6 14h12M10 18h4"/></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M6 10h12M4 15h16M8 20h8"/></svg>
          )}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-2 sm:space-x-3 focus:outline-none hover:bg-gray-50 px-2 sm:px-3 py-2 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-20 border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500">{user?.email || 'user@example.com'}</p>
                </div>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors">
                  Profile
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors">
                  Settings
                </button>
                <hr className="my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Visitor Approval Modal */}
      {selectedVisitor && (
        <VisitorApprovalModal
          visitor={selectedVisitor}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setSelectedVisitor(null)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200">
              <h1 className="text-green-600 font-bold">Smart Home</h1>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-2 rounded-md hover:bg-gray-50"
                aria-label="Close navigation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
              {menuItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => { setMobileSidebarOpen(false); window.location.hash = `#${item.path}`; }}
                  className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </>
      )}
    </div>
  );
};
