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
      <nav className="container mx-auto px-4 sm:px-6">
        <div className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center space-x-1 sm:space-x-2 border-b-2 px-2 sm:px-1 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">{tab.label}</span>
                <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
