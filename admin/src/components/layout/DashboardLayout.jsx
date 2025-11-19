import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNavBar } from './MobileNavBar';

export const DashboardLayout = ({ children }) => {
  return (
    <div className="relative flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar (hidden on mobile) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Scrollable Page Content; bottom padding ensures content not hidden behind mobile nav */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-gray-100/60 backdrop-blur-sm md:pb-6 pb-24">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavBar />
    </div>
  );
};
