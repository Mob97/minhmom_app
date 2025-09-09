import React from 'react';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { BarChart3, FileText, Settings, Users, ShoppingCart, UserCheck } from 'lucide-react';

const adminTabs = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
  { id: 'posts' as const, label: t.nav.posts, icon: FileText },
  { id: 'orders' as const, label: 'Đơn hàng', icon: ShoppingCart },
  { id: 'userOrders' as const, label: t.nav.userOrders, icon: UserCheck },
  { id: 'statuses' as const, label: t.nav.statuses, icon: Settings },
  { id: 'users' as const, label: t.nav.users, icon: Users },
];

const userTabs = [
  { id: 'posts' as const, label: t.nav.posts, icon: FileText },
  { id: 'orders' as const, label: 'Đơn hàng', icon: ShoppingCart },
  { id: 'userOrders' as const, label: t.nav.userOrders, icon: UserCheck },
  { id: 'statuses' as const, label: t.nav.statuses, icon: Settings },
  { id: 'users' as const, label: t.nav.users, icon: Users },
];

export const NavigationTabs: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();
  const { isAdmin } = useAuth();

  const tabs = isAdmin ? adminTabs : userTabs;

  return (
    <div className="border-b">
      <nav className="container mx-auto px-6 flex space-x-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center space-x-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
