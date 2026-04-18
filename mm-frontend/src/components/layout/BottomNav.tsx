import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { BarChart3, FileText, Settings, Users, ShoppingCart, UserCheck } from 'lucide-react';

const adminNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/posts', label: 'Bài đăng', icon: FileText },
  { path: '/orders', label: 'Đơn hàng', icon: ShoppingCart },
  { path: '/user-orders', label: 'KH đơn', icon: UserCheck },
  { path: '/users', label: t.nav.users, icon: Users },
];

const userNavItems = [
  { path: '/posts', label: 'Bài đăng', icon: FileText },
  { path: '/orders', label: 'Đơn hàng', icon: ShoppingCart },
  { path: '/user-orders', label: 'KH đơn', icon: UserCheck },
  { path: '/statuses', label: 'Trạng thái', icon: Settings },
  { path: '/users', label: t.nav.users, icon: Users },
];

export const BottomNav: React.FC = () => {
  const { isAdmin } = useAuth();
  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      <div className="flex items-stretch h-16">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-medium transition-colors duration-150',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'w-9 h-8 rounded-lg flex items-center justify-center transition-colors duration-150',
                    isActive && 'bg-primary/10'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
