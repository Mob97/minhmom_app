import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/app-store';
import { useAllOrders, useStatuses, useUpdateOrderStatus } from '@/hooks/use-api';
import { t } from '@/lib/i18n';
import type { Order } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, ExternalLink, Eye, Filter, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { OrdersDrawer } from '@/components/orders/OrdersDrawer';
import { useToast } from '@/hooks/use-toast';
import { SortableHeader, type SortConfig } from '@/components/ui/sortable-header';

export const OrdersScreen: React.FC = () => {
  const { selectedGroupId, setSelectedPostId, setOrdersDrawerOpen } = useAppStore();
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [newStatusCode, setNewStatusCode] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'comment_created_time',
    direction: 'desc'
  });
  const initializedRef = useRef(false);

  const { data: ordersResponse, isLoading, error, refetch } = useAllOrders(selectedGroupId || '', {
    page: currentPage,
    page_size: pageSize,
    sort_by: sortConfig.field,
    sort_direction: sortConfig.direction || 'desc',
  });
  const { data: statuses } = useStatuses({ active: true });
  const updateOrderStatusMutation = useUpdateOrderStatus();
  const { toast } = useToast();

  const orders = ordersResponse?.data || [];
  const totalPages = ordersResponse?.total_pages || 1;
  const total = ordersResponse?.total || 0;

  // Initialize default selected statuses (all except completed and cancelled)
  useEffect(() => {
    if (statuses && !initializedRef.current) {
      const defaultStatuses = statuses
        .filter(status =>
          status.status_code !== 'DONE' &&
          status.status_code !== 'CANCELLED'
        )
        .map(status => status.status_code);
      setSelectedStatuses(defaultStatuses);
      initializedRef.current = true;
    }
  }, [statuses]);

  // Filter orders based on selected statuses
  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    return orders.filter((order: Order) => selectedStatuses.includes(order.status_code));
  }, [orders, selectedStatuses]);

  const handleStatusToggle = (statusCode: string) => {
    setSelectedStatuses(prev =>
      prev.includes(statusCode)
        ? prev.filter(s => s !== statusCode)
        : [...prev, statusCode]
    );
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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


  const handleCancelEdit = () => {
    setEditingOrderId(null);
    setNewStatusCode('');
  };

  const handleUpdateStatus = async (order: Order) => {
    if (!newStatusCode || newStatusCode === order.status_code) {
      handleCancelEdit();
      return;
    }

    if (!order.post_id) {
      toast({
        title: 'Error updating status',
        description: 'Post ID not found for this order',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateOrderStatusMutation.mutateAsync({
        groupId: selectedGroupId || '',
        postId: order.post_id,
        orderId: order.order_id,
        data: {
          new_status_code: newStatusCode,
          note: `Status updated from ${getStatusDisplayName(order.status_code)} to ${getStatusDisplayName(newStatusCode)}`,
          actor: 'admin'
        }
      });

      toast({
        title: 'Status updated successfully',
        description: `Order ${order.order_id} status updated to ${getStatusDisplayName(newStatusCode)}`,
      });

      handleCancelEdit();
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.detail || 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (order: Order, newStatus: string) => {
    if (newStatus === order.status_code) {
      return; // No change needed
    }

    if (!order.post_id) {
      toast({
        title: 'Error updating status',
        description: 'Post ID not found for this order',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateOrderStatusMutation.mutateAsync({
        groupId: selectedGroupId || '',
        postId: order.post_id,
        orderId: order.order_id,
        data: {
          new_status_code: newStatus,
          note: `Status updated from ${getStatusDisplayName(order.status_code)} to ${getStatusDisplayName(newStatus)}`,
          actor: 'admin'
        }
      });

      toast({
        title: 'Status updated successfully',
        description: `Order ${order.order_id} status updated to ${getStatusDisplayName(newStatus)}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.detail || 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const handleProductNameClick = (order: Order) => {
    if (order.post_id) {
      setSelectedPostId(order.post_id);
      setOrdersDrawerOpen(true);
    }
  };

  const getStatusDisplayName = (statusCode: string) => {
    const status = statuses?.find(s => s.status_code === statusCode);
    return status?.display_name || statusCode;
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

  const ordersList = filteredOrders || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quản lý đơn hàng</h2>
          <p className="text-muted-foreground">
            {total} đơn hàng ({t.common.page} {currentPage} / {totalPages})
          </p>
        </div>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t.common.refresh}
        </Button>
      </div>

      {/* Status Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Lọc theo trạng thái</span>
          </CardTitle>
          <CardDescription>
            Chọn các trạng thái muốn hiển thị. Mặc định tất cả các trạng thái được chọn trừ "Hoàn thành" và "Đã hủy".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {statuses?.map((status) => (
              <div key={status.status_code} className="flex items-center space-x-2">
                <Checkbox
                  id={status.status_code}
                  checked={selectedStatuses.includes(status.status_code)}
                  onCheckedChange={() => handleStatusToggle(status.status_code)}
                />
                <label
                  htmlFor={status.status_code}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {status.display_name}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {ordersList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">Không có đơn hàng nào</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-3">
                  <SortableHeader
                    field="user.name"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  >
                    Người dùng
                  </SortableHeader>
                </TableHead>
                <TableHead className="px-6 py-3">
                  <SortableHeader
                    field="matched_item.name"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  >
                    Tên sản phẩm
                  </SortableHeader>
                </TableHead>
                <TableHead className="px-6 py-3">Loại sản phẩm</TableHead>
                <TableHead className="px-6 py-3">
                  <SortableHeader
                    field="qty"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  >
                    Số Lượng
                  </SortableHeader>
                </TableHead>
                <TableHead className="px-6 py-3">Loại</TableHead>
                <TableHead className="px-6 py-3">
                  <SortableHeader
                    field="price_calc.total"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  >
                    Tổng Cộng
                  </SortableHeader>
                </TableHead>
                <TableHead className="px-6 py-3">
                  <SortableHeader
                    field="status_code"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  >
                    Trạng thái
                  </SortableHeader>
                </TableHead>
                <TableHead className="px-6 py-3">
                  <SortableHeader
                    field="comment_created_time"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  >
                    Thời gian
                  </SortableHeader>
                </TableHead>
                <TableHead className="px-6 py-3 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersList.map((order: Order) => (
                <TableRow key={order.order_id || order.comment_id}>
                  <TableCell className="px-6 py-4">
                    {order.user ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">
                          {order.user?.name || order.user?.username || order.user?.uid}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(order.user?.url || `https://www.facebook.com/${order.user?.uid}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="max-w-xs">
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto font-normal text-left justify-start text-blue-600 hover:text-blue-800"
                        onClick={() => handleProductNameClick(order)}
                        disabled={!order.post_id}
                      >
                        <p className="truncate">
                          {order.matched_item?.name || 'Chưa xác định'}
                        </p>
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant="outline">
                      {order.matched_item?.type || order.type || 'Chưa xác định'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {t.currency.formatNumber(order.qty)}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {order.type || '—'}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-medium">
                    {order.price_calc ?
                      t.currency.format(order.price_calc.total) :
                      '—'
                    }
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {editingOrderId === order.order_id ? (
                      <div className="flex items-center space-x-2">
                        <Select value={newStatusCode} onValueChange={setNewStatusCode}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses?.map((status) => (
                              <SelectItem key={status.status_code} value={status.status_code}>
                                {status.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(order)}
                          disabled={updateOrderStatusMutation.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Select
                          value={order.status_code || undefined}
                          onValueChange={(value: string) => handleStatusChange(order, value)}
                          disabled={updateOrderStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses?.map((status) => (
                              <SelectItem key={status.status_code} value={status.status_code}>
                                {status.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                    {order.comment_created_time ? new Date(order.comment_created_time).toLocaleString('vi-VN') : '—'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* Orders Drawer */}
      <OrdersDrawer />
    </div>
  );
};
