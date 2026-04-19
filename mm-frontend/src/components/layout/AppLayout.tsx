import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-svh bg-background">
      {/* Sidebar: tablet (md) and desktop (lg) */}
      <Sidebar />

      {/* Content area: offset left for sidebar on md+ */}
      <div className="md:pl-[72px] lg:pl-[240px] flex flex-col min-h-svh">
        {/* Mobile-only top header */}
        <Header />

        {/* Page content with bottom padding for mobile bottom nav */}
        <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6 pb-20 md:pb-6 max-w-screen-2xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav: mobile only */}
      <BottomNav />
    </div>
  );
};
