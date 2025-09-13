import React from 'react';
import { useAppStore } from '@/store/app-store';
import { getConfig } from '@/lib/api-client';
import { t } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const TopBar: React.FC = () => {
  const { selectedGroupId } = useAppStore();
  const { environment } = getConfig();
  const { user, logout, isAdmin } = useAuth();

  const getEnvironmentBadge = () => {
    switch (environment) {
      case 'production':
        return <Badge variant="destructive">Production</Badge>;
      case 'staging':
        return <Badge variant="secondary">Staging</Badge>;
      default:
        return <Badge variant="outline">Development</Badge>;
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 flex h-14 items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <h1 className="text-base sm:text-lg font-semibold">{t.nav.admin}</h1>
          <div className="hidden sm:block">
            {getEnvironmentBadge()}
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden md:flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Group ID:</span>
            <Badge variant="outline">{selectedGroupId}</Badge>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <Settings className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {isAdmin ? t.nav.admin : t.common.user}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t.auth.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
