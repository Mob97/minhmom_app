import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { PostsScreen } from '@/screens/PostsScreen';
import { OrdersScreen } from '@/screens/OrdersScreen';
import { UserOrdersScreen } from '@/screens/UserOrdersScreen';
import { StatusesScreen } from '@/screens/StatusesScreen';
import { UsersScreen } from '@/screens/UsersScreen';
import { AuthPage } from '@/components/auth/AuthPage';
import { useAppStore } from '@/store/app-store';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const { activeTab } = useAppStore();
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'posts':
        return <PostsScreen />;
      case 'orders':
        return <OrdersScreen />;
      case 'userOrders':
        return <UserOrdersScreen />;
      case 'statuses':
        return <StatusesScreen />;
      case 'users':
        return <UsersScreen />;
      default:
        // Default to dashboard for admins, posts for regular users
        return isAdmin ? <DashboardScreen /> : <PostsScreen />;
    }
  };

  return (
    <MainLayout>
      {renderActiveScreen()}
    </MainLayout>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
        <Toaster />
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
