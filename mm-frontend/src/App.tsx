import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthPage } from '@/components/auth/AuthPage';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { PostsScreen } from '@/screens/PostsScreen';
import { OrdersScreen } from '@/screens/OrdersScreen';
import { UserOrdersScreen } from '@/screens/UserOrdersScreen';
import { StatusesScreen } from '@/screens/StatusesScreen';
import { UsersScreen } from '@/screens/UsersScreen';
import { Toaster } from '@/components/ui/toaster';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

const LoadingScreen: React.FC = () => (
  <div className="min-h-svh flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto" />
      <p className="mt-3 text-sm text-muted-foreground">Đang tải...</p>
    </div>
  </div>
);

const AppRoutes: React.FC = () => {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <AuthPage />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to={isAdmin ? '/dashboard' : '/posts'} replace />} />
        {isAdmin && <Route path="/dashboard" element={<DashboardScreen />} />}
        <Route path="/posts" element={<PostsScreen />} />
        <Route path="/orders" element={<OrdersScreen />} />
        <Route path="/user-orders" element={<UserOrdersScreen />} />
        <Route path="/statuses" element={<StatusesScreen />} />
        <Route path="/users" element={<UsersScreen />} />
        <Route path="*" element={<Navigate to={isAdmin ? '/dashboard' : '/posts'} replace />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster />
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
