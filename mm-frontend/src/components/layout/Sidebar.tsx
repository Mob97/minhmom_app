import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getAppConfig } from '@/config/app-config';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { BarChart3, FileText, Settings, Users, ShoppingCart, UserCheck, KeyRound, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog';

const allNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3, adminOnly: true },
  { path: '/posts', label: 'Bài đăng', icon: FileText, adminOnly: false },
  { path: '/orders', label: 'Đơn hàng', icon: ShoppingCart, adminOnly: false },
  { path: '/user-orders', label: 'KH đơn hàng', icon: UserCheck, adminOnly: false },
  { path: '/statuses', label: t.nav.statuses, icon: Settings, adminOnly: false },
  { path: '/users', label: t.nav.users, icon: Users, adminOnly: false },
];

export const Sidebar: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const { environment } = getAppConfig();

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-[72px] lg:w-[240px] bg-card border-r border-border z-40">
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-border shrink-0 gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-sm font-bold">M</span>
          </div>
          <div className="hidden lg:flex lg:flex-col min-w-0">
            <span className="font-semibold text-sm leading-tight truncate">{t.nav.admin}</span>
            {environment === 'production' && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 w-fit mt-0.5">Prod</Badge>
            )}
            {environment === 'staging' && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 w-fit mt-0.5">Staging</Badge>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                  'min-h-[44px] cursor-pointer',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:block truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-2 space-y-0.5">
          <div className="hidden lg:flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary text-xs font-semibold uppercase">
                {user?.username?.[0] ?? 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight truncate">{user?.username}</p>
              <p className="text-xs text-muted-foreground">{isAdmin ? 'Admin' : 'User'}</p>
            </div>
          </div>
          <button
            onClick={() => setIsChangePasswordOpen(true)}
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150 min-h-[44px] cursor-pointer"
          >
            <KeyRound className="h-4 w-4 shrink-0" />
            <span className="hidden lg:block">{t.auth.changePassword}</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-150 min-h-[44px] cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="hidden lg:block">{t.auth.logout}</span>
          </button>
        </div>
      </aside>

      <ChangePasswordDialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen} />
    </>
  );
};
