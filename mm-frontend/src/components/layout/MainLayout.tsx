import React from 'react';
import { TopBar } from './TopBar';
import { NavigationTabs } from './NavigationTabs';
import { Toaster } from '@/components/ui/toaster';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <NavigationTabs />
      <main className="container mx-auto px-6 py-6">
        {children}
      </main>
      <Toaster />
    </div>
  );
};
