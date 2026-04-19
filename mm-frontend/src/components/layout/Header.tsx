import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAppConfig } from '@/config/app-config';
import { t } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogOut, KeyRound } from 'lucide-react';
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Header: React.FC = () => {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { environment } = getAppConfig();

  return (
    <>
      {/* Mobile-only top header */}
      <header className="md:hidden sticky top-0 z-30 h-14 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-xs font-bold">M</span>
          </div>
          <span className="font-semibold text-sm">{t.nav.admin}</span>
          {environment === 'production' && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Prod</Badge>
          )}
          {environment === 'staging' && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Staging</Badge>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-xs font-semibold uppercase">
                  {user?.username?.[0] ?? 'U'}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <p className="text-sm font-medium leading-none">{user?.username}</p>
              <p className="text-xs text-muted-foreground mt-1">{isAdmin ? 'Admin' : 'User'}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              {t.auth.changePassword}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t.auth.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <ChangePasswordDialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen} />
    </>
  );
};
