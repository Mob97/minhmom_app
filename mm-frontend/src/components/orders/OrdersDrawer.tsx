import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useAppStore } from '@/store/app-store';
import { useOrders, useStatuses, usePost, useUpdatePost } from '@/hooks/use-api';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Plus, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import { CreateOrderModal } from './CreateOrderModal';
import { EditOrderModal } from './EditOrderModal';
import { DeleteOrderDialog } from './DeleteOrderDialog';
import { ItemManagementModal } from './ItemManagementModal';
import { useToast } from '@/hooks/use-toast';
import { useUpdateOrderStatus, useUpdateOrder, useCreateOrder, useDeleteOrder } from '@/hooks/use-api';
import { ImageGallery } from '@/components/ui/image-gallery';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import type { Order } from '@/types/api';

export const OrdersDrawer: React.FC = () => {
  const {
    selectedGroupId,
    selectedPostId,
    isOrdersDrawerOpen,
    setOrdersDrawerOpen,
    ordersStatusFilter,
    setOrdersStatusFilter,
    isCreateOrderModalOpen,
    setCreateOrderModalOpen
  } = useAppStore();

  const { data: orders, isLoading, error, refetch } = useOrders(
    selectedGroupId,
    selectedPostId || ''
  );

  const { data: post, isLoading: isPostLoading } = usePost(
    selectedGroupId || '',
    selectedPostId || ''
  );

  const { data: statuses } = useStatuses({ active: true });
  const updateOrderStatusMutation = useUpdateOrderStatus();
  const updateOrderMutation = useUpdateOrder();
  const createOrderMutation = useCreateOrder();
  const deleteOrderMutation = useDeleteOrder();
  const updatePostMutation = useUpdatePost();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [isEditingImportPrice, setIsEditingImportPrice] = useState(false);
  const [importPriceValue, setImportPriceValue] = useState('');
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDeleteOrderDialogOpen, setIsDeleteOrderDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isItemManagementModalOpen, setIsItemManagementModalOpen] = useState(false);

  const filteredOrders = orders?.filter(order =>
    !ordersStatusFilter || ordersStatusFilter === "all" || order.status_code === ordersStatusFilter
  ) || [];


  // Calculate total revenue (order total - import price * total quantity)
  const calculateTotalRevenue = () => {
    if (!filteredOrders || !post?.import_price) return 0;

    const totalOrderValue = filteredOrders.reduce((sum, order) => {
      return sum + (order.price_calc?.total || 0);
    }, 0);

    const totalQuantity = filteredOrders.reduce((sum, order) => {
      return sum + (order.qty || 0);
    }, 0);

    const importPrice = post.import_price || 0;
    const totalImportCost = importPrice * totalQuantity;
    return Math.max(0, totalOrderValue - totalImportCost);
  };

  const totalRevenue = calculateTotalRevenue();

  // Calculate NEW orders count by type
  const calculateNewOrdersByType = () => {
    if (!filteredOrders) return {};

    return filteredOrders.reduce((acc, order) => {
      if (order.status_code === 'NEW') {
        const type = order.type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  };

  const newOrdersByType = calculateNewOrdersByType();

  const handleEditImportPrice = () => {
    setImportPriceValue(post?.import_price?.toString() || '');
    setIsEditingImportPrice(true);
  };

  const handleSaveImportPrice = async () => {
    if (!selectedGroupId || !selectedPostId) return;

    const numericValue = parseFloat(importPriceValue);
    if (isNaN(numericValue) && importPriceValue !== '') {
      toast({
        title: 'Error',
        description: 'Please enter a valid number',
        variant: 'destructive',
      });
      return;
    }

    updatePostMutation.mutate(
      {
        groupId: selectedGroupId,
        postId: selectedPostId,
        data: {
          import_price: importPriceValue === '' ? undefined : numericValue
        }
      },
      {
        onSuccess: () => {
          setIsEditingImportPrice(false);
          toast({
            title: 'Success',
            description: 'Import price updated successfully',
          });
        },
        onError: (error: any) => {
          toast({
            title: 'Error',
            description: error.detail || 'Failed to update import price',
            variant: 'destructive',
          });
        }
      }
    );
  };

  const handleCancelEditImportPrice = () => {
    setIsEditingImportPrice(false);
    setImportPriceValue('');
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (!selectedGroupId || !selectedPostId) return;

    try {
      await updateOrderStatusMutation.mutateAsync({
        groupId: selectedGroupId,
        postId: selectedPostId,
        orderId,
        data: { new_status_code: newStatus }
      });
      toast({
        title: t.success.orderUpdated,
        description: `${t.common.order} ${orderId} đã được cập nhật`,
      });
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.detail || t.errors.unknownError,
        variant: 'destructive',
      });
    }
  };

  const handleCreateOrder = () => {
    setCreateOrderModalOpen(true);
  };

  const handleCreateOrderSubmit = async (data: any) => {
    if (!selectedGroupId || !selectedPostId) return;

    try {
      await createOrderMutation.mutateAsync({
        groupId: selectedGroupId,
        postId: selectedPostId,
        data
      });
      toast({
        title: 'Success',
        description: 'Order created successfully',
      });
      setCreateOrderModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.detail || 'Failed to create order',
        variant: 'destructive',
      });
    }
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsEditOrderModalOpen(true);
  };

  const handleUpdateOrder = async (data: any) => {
    if (!selectedGroupId || !selectedPostId || !selectedOrder) return;

    try {
      await updateOrderMutation.mutateAsync({
        groupId: selectedGroupId,
        postId: selectedPostId,
        orderId: selectedOrder.order_id || selectedOrder.comment_id || '',
        data
      });
      toast({
        title: 'Success',
        description: 'Order updated successfully',
      });
      setIsEditOrderModalOpen(false);
      setSelectedOrder(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.detail || 'Failed to update order',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteOrder = (order: Order) => {
    setOrderToDelete(order);
    setIsDeleteOrderDialogOpen(true);
  };

  const handleConfirmDeleteOrder = async (orderId: string) => {
    if (!selectedGroupId || !selectedPostId) return;

    try {
      await deleteOrderMutation.mutateAsync({
        groupId: selectedGroupId,
        postId: selectedPostId,
        orderId
      });
      toast({
        title: 'Success',
        description: 'Order deleted successfully',
      });
      setIsDeleteOrderDialogOpen(false);
      setOrderToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.detail || 'Failed to delete order',
        variant: 'destructive',
      });
    }
  };

  const handleSaveItems = async (items: any[]) => {
    if (!selectedGroupId || !selectedPostId) return;

    try {
      await updatePostMutation.mutateAsync({
        groupId: selectedGroupId,
        postId: selectedPostId,
        data: { items }
      });
      toast({
        title: 'Success',
        description: 'Items updated successfully',
      });
      setIsItemManagementModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.detail || 'Failed to update items',
        variant: 'destructive',
      });
    }
  };

  if (!selectedPostId) {
    return null;
  }

  return (
    <>
      <Drawer open={isOrdersDrawerOpen} onOpenChange={setOrdersDrawerOpen}>
        <DrawerContent className="h-[80vh]">
          <DrawerHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
              <div className="flex-1">
                <DrawerTitle className="text-lg sm:text-xl">Đơn hàng - Post #{selectedPostId}</DrawerTitle>
                <DrawerDescription className="text-sm">
                  {filteredOrders.length} {t.common.order.toLowerCase()}
                </DrawerDescription>

                {/* Post Details */}
                {isPostLoading ? (
                  <div className="mt-4 flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading post details...</span>
                  </div>
                ) : post ? (
                  <div className="mt-4 space-y-3">
                    {/* Post Description */}
                    {post.description && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Description:</h4>
                        <p className="text-sm line-clamp-3">{post.description}</p>
                      </div>
                    )}

                     {/* Import Price - Admin Only */}
                     {isAdmin && (
                       <div>
                         <h4 className="text-sm font-medium text-muted-foreground mb-1">Giá nhập:</h4>

                         {isEditingImportPrice ? (
                           <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                             <Input
                               type="number"
                               value={importPriceValue}
                               onChange={(e) => setImportPriceValue(e.target.value)}
                               placeholder="Enter import price"
                               className="h-8 text-sm w-full sm:w-48"
                             />
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={handleSaveImportPrice}
                                className="h-8 px-3 flex-1 sm:flex-none"
                                disabled={updatePostMutation.isPending}
                              >
                                {updatePostMutation.isPending ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEditImportPrice}
                                className="h-8 px-3 flex-1 sm:flex-none"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                         ) : (
                           <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                             <p className="text-sm font-semibold text-green-600">
                               {post.import_price ? (
                                 new Intl.NumberFormat('vi-VN', {
                                   style: 'currency',
                                   currency: 'VND'
                                 }).format(post.import_price)
                               ) : (
                                 <span className="text-muted-foreground">No import price set</span>
                               )}
                             </p>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={handleEditImportPrice}
                               className="h-6 px-2 w-fit"
                             >
                               <Edit2 className="h-3 w-3 mr-1" />
                               Edit
                             </Button>
                           </div>
                         )}
                       </div>
                     )}

                    {/* Post Items Management */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 mb-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Sản phẩm:</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsItemManagementModalOpen(true)}
                          className="h-7 px-2 w-fit"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Quản lý
                        </Button>
                      </div>
                      {post.items && post.items.length > 0 ? (
                        <div className="space-y-1">
                          {post.items.map((item, index) => (
                            <div key={index} className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="text-xs">{item.name || 'Unnamed Item'}</Badge>
                              {item.type && <span className="text-xs text-muted-foreground">({item.type})</span>}
                              {item.prices && item.prices.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {item.prices.length} giá
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Chưa có sản phẩm nào</p>
                      )}
                    </div>

                    {/* Post Images */}
                    {post.local_images && post.local_images.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Images:</h4>
                        <ImageGallery
                          images={post.local_images}
                          postId={post.id}
                          maxDisplay={3}
                        />
                      </div>
                    )}

                  </div>
                ) : null}
              </div>

              <div className="flex flex-col lg:items-end space-y-3 lg:space-y-2 lg:ml-4">
                {/* Statistics by Type */}
                {Object.keys(newOrdersByType).length > 0 && (
                  <div className="lg:text-right">
                    <div className="text-sm text-muted-foreground mb-1">Đơn hàng chưa đặt:</div>
                    <div className="space-y-1">
                      {Object.entries(newOrdersByType)
                        .sort(([, a], [, b]) => b - a) // Sort by count descending
                        .map(([type, count]) => (
                          <div key={type} className="text-sm">
                            {type}: {count}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Revenue Display */}
                {isAdmin && post?.import_price && (
                  <div className="lg:text-right">
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                    <div className="text-xl lg:text-2xl font-bold text-green-600">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(totalRevenue)}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button onClick={() => refetch()} className="w-full sm:w-auto">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t.common.refresh}
                  </Button>
                  <Button onClick={handleCreateOrder} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    {t.posts.createOrder}
                  </Button>
                </div>
              </div>
            </div>

          </DrawerHeader>

          <div className="flex-1 overflow-auto p-4 sm:p-6">
            {/* Filters */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <span className="text-sm font-medium">Lọc theo trạng thái:</span>
                <Select value={ordersStatusFilter || "all"} onValueChange={setOrdersStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Tất cả trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    {statuses?.map((status) => (
                      <SelectItem key={status.status_code} value={status.status_code}>
                        {status.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Orders Table */}
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">{t.common.loading}</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <p className="text-destructive mb-4">{t.errors.networkError}</p>
                  <Button onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t.common.refresh}
                  </Button>
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">{t.posts.noOrders}</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.common.user}</TableHead>
                        <TableHead>{t.common.quantity}</TableHead>
                        <TableHead>{t.common.type}</TableHead>
                        <TableHead>{t.common.total}</TableHead>
                        <TableHead>{t.common.status}</TableHead>
                        <TableHead>Ghi chú</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.order_id || order.comment_id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto font-normal text-left justify-start truncate max-w-32"
                                onClick={() => window.open(order.url, '_blank')}
                              >
                                {order.user?.name || order.user?.fb_username || 'Unknown User'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(order.url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{t.currency.formatNumber(order.qty)}</TableCell>
                          <TableCell>{order.type}</TableCell>
                          <TableCell>
                            {order.price_calc ?
                              t.currency.format(order.price_calc.total) :
                              '—'
                            }
                          </TableCell>
                          <TableCell>
                            <Select
                              value={order.status_code || undefined}
                              onValueChange={(value: string) => handleStatusChange(
                                order.order_id || order.comment_id || '',
                                value
                              )}
                              disabled={updateOrderStatusMutation.isPending}
                            >
                              <SelectTrigger className="w-32">
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
                          </TableCell>
                          <TableCell>
                            <div className="max-w-32 truncate" title={order.note || ''}>
                              {order.note || '—'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditOrder(order)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteOrder(order)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {filteredOrders.map((order) => (
                    <div key={order.order_id || order.comment_id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto font-medium text-left justify-start text-blue-600 hover:text-blue-800"
                              onClick={() => window.open(order.url, '_blank')}
                            >
                              <span className="truncate text-sm sm:text-base">
                                {order.user?.name || order.user?.fb_username || 'Unknown User'}
                              </span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 flex-shrink-0"
                              onClick={() => window.open(order.url, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Số lượng:</span>
                              <span className="font-medium">{t.currency.formatNumber(order.qty)}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Loại:</span>
                              <span className="font-medium">{order.type}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tổng cộng:</span>
                              <span className="font-medium">
                                {order.price_calc ?
                                  t.currency.format(order.price_calc.total) :
                                  '—'
                                }
                              </span>
                            </div>

                            {order.note && (
                              <div>
                                <span className="text-muted-foreground">Ghi chú:</span>
                                <p className="text-sm mt-1 line-clamp-2">{order.note}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditOrder(order)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteOrder(order)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Select
                          value={order.status_code || undefined}
                          onValueChange={(value: string) => handleStatusChange(
                            order.order_id || order.comment_id || '',
                            value
                          )}
                          disabled={updateOrderStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Chọn trạng thái" />
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
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <CreateOrderModal
        open={isCreateOrderModalOpen}
        onOpenChange={setCreateOrderModalOpen}
        onSubmit={handleCreateOrderSubmit}
        loading={createOrderMutation.isPending}
      />

      <EditOrderModal
        open={isEditOrderModalOpen}
        onOpenChange={setIsEditOrderModalOpen}
        onSubmit={handleUpdateOrder}
        order={selectedOrder}
        loading={updateOrderMutation.isPending}
      />

      <DeleteOrderDialog
        open={isDeleteOrderDialogOpen}
        onOpenChange={setIsDeleteOrderDialogOpen}
        order={orderToDelete}
        onConfirm={handleConfirmDeleteOrder}
        loading={deleteOrderMutation.isPending}
      />

      <ItemManagementModal
        open={isItemManagementModalOpen}
        onOpenChange={setIsItemManagementModalOpen}
        items={post?.items || []}
        onSave={handleSaveItems}
        loading={updatePostMutation.isPending}
      />
    </>
  );
};
