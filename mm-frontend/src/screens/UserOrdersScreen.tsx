import React, { useState } from 'react';
import { useUsersWithOrders } from '@/hooks/use-api';
import { useAppStore } from '@/store/app-store';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, RefreshCw, Eye } from 'lucide-react';
import { UserOrdersDrawer } from '@/components/orders/UserOrdersDrawer';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader, type SortConfig } from '@/components/ui/sortable-header';

export const UserOrdersScreen: React.FC = () => {
  const {
    usersSearchQuery,
    setUsersSearchQuery,
    setSelectedUserId,
    setUserOrdersDrawerOpen
  } = useAppStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [activeOrdersOnly, setActiveOrdersOnly] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'order_count',
    direction: 'desc'
  });

  const { selectedGroupId } = useAppStore();

  const { data: usersResponse, isLoading, error, refetch } = useUsersWithOrders(selectedGroupId || '', {
    q: usersSearchQuery || undefined,
    page: currentPage,
    page_size: pageSize,
    sort_by: sortConfig.field,
    sort_direction: sortConfig.direction || 'desc',
    active_orders_only: activeOrdersOnly,
  });

  const users = usersResponse?.data || [];
  const totalPages = usersResponse?.total_pages || 1;
  const total = usersResponse?.total || 0;


  const handleViewUserOrders = (fb_uid: string) => {
    setSelectedUserId(fb_uid);
    setUserOrdersDrawerOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setUsersSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleSort = (field: string) => {
    setSortConfig(prev => {
      if (prev.field === field) {
        // Cycle through: desc -> asc -> null -> desc
        if (prev.direction === 'desc') return { field, direction: 'asc' };
        if (prev.direction === 'asc') return { field, direction: null };
        return { field, direction: 'desc' };
      }
      return { field, direction: 'desc' };
    });
    setCurrentPage(1); // Reset to first page when sorting
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">{t.errors.networkError}</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.common.refresh}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t.userOrders.title}</h2>
          <p className="text-muted-foreground">
            {total} {t.userOrders.title.toLowerCase()} ({t.common.page} {currentPage} / {totalPages})
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.common.refresh}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${t.common.search} ${t.userOrders.title.toLowerCase()}...`}
            value={usersSearchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Active Orders Only Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="active-orders-only"
            checked={activeOrdersOnly}
            onCheckedChange={(checked) => setActiveOrdersOnly(checked as boolean)}
          />
          <label
            htmlFor="active-orders-only"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Chỉ hiển thị đơn hàng đang xử lý
          </label>
        </div>
      </div>

      {/* Users Table */}
      {!users || users.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">{t.userOrders.noUsers}</p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader
                    field="name"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  >
                    {t.users.name}
                  </SortableHeader>
                </TableHead>
                <TableHead>{t.users.address}</TableHead>
                <TableHead>{t.users.phoneNumber}</TableHead>
                <TableHead>
                  <SortableHeader
                    field="order_count"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  >
                    {t.userOrders.orderCount}
                  </SortableHeader>
                </TableHead>
                <TableHead className="text-right">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.fb_uid}>
                  <TableCell className="font-medium">
                    {user.name ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(user.fb_url || `https://www.facebook.com/${user.fb_uid}`, '_blank')}
                        className="p-0 h-auto text-left justify-start"
                      >
                        {user.name}
                      </Button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {user.addresses && user.addresses.length > 0 ? user.addresses[0] : '—'}
                    {user.addresses && user.addresses.length > 1 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (+{user.addresses.length - 1})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.phone_number || '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {user.order_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewUserOrders(user.fb_uid)}
                        title="Xem đơn hàng"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* User Orders Drawer */}
      <UserOrdersDrawer showAllOrders={!activeOrdersOnly} />
    </div>
  );
};
