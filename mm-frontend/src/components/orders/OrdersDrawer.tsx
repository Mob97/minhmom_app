import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useAppStore } from '@/store/app-store';
import { useOrders, useStatuses, usePost, useUpdatePost } from '@/hooks/use-api';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RefreshCw, Plus, ExternalLink, Edit2, Trash2, Split } from 'lucide-react';
import { CreateOrderModal } from './CreateOrderModal';
import { EditOrderModal } from './EditOrderModal';
import { DeleteOrderDialog } from './DeleteOrderDialog';
import { ItemManagementModal } from './ItemManagementModal';
import { SplitOrderModal } from './SplitOrderModal';
import { useToast } from '@/hooks/use-toast';
import { useUpdateOrderStatus, useUpdateOrder, useCreateOrder, useDeleteOrder, useSplitOrder } from '@/hooks/use-api';
import { ImageGallery } from '@/components/ui/image-gallery';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import type { Order } from '@/types/api';
import {
  getOrderCustomerName,
  getOrderCustomerUrl,
  getOrderQuantity,
  getOrderType,
  getOrderTotalPrice,
  getOrderPriceCalc,
  getOrderCommentId,
  getOrderCommentCreatedTime
} from '@/types/api';

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
  const splitOrderMutation = useSplitOrder();
  const updatePostMutation = useUpdatePost();
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();

  // Helper function to get status display name
  const getStatusDisplayName = (statusCode: string) => {
    const status = statuses?.find((s: any) => s.status_code === statusCode);
    return status?.display_name || statusCode;
  };

  // Helper function to find status code by display name
  const findStatusCodeByDisplayName = (displayName: string): string | undefined => {
    return statuses?.find((s: any) => s.display_name === displayName)?.status_code;
  };

  const [isEditingImportPrice, setIsEditingImportPrice] = useState(false);
  const [importPriceValue, setImportPriceValue] = useState('');
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDeleteOrderDialogOpen, setIsDeleteOrderDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isItemManagementModalOpen, setIsItemManagementModalOpen] = useState(false);
  const [isSplitOrderModalOpen, setIsSplitOrderModalOpen] = useState(false);
  const [orderToSplit, setOrderToSplit] = useState<Order | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showBatchUpdateDialog, setShowBatchUpdateDialog] = useState(false);
  const [ordersToUpdate, setOrdersToUpdate] = useState<Order[]>([]);
  const [newStatusCode, setNewStatusCode] = useState<string>('');

  const filteredOrders = (orders?.filter((order: Order) =>
    !ordersStatusFilter || ordersStatusFilter === "all" || order.status_code === ordersStatusFilter
  ) || []).sort((a: Order, b: Order) => {
    const timeA = getOrderCommentCreatedTime(a);
    const timeB = getOrderCommentCreatedTime(b);

    // Handle cases where comment_created_time might be undefined
    if (!timeA && !timeB) return 0;
    if (!timeA) return 1; // Put orders without time at the end
    if (!timeB) return -1; // Put orders without time at the end

    // Sort in ascending order (oldest first)
    return new Date(timeA).getTime() - new Date(timeB).getTime();
  });


  // Calculate total revenue (order total - import price * total quantity)
  const calculateTotalRevenue = () => {
    if (!filteredOrders || !post?.import_price) return 0;

    const totalOrderValue = filteredOrders.reduce((sum, order) => {
      return sum + getOrderTotalPrice(order);
    }, 0);

    const totalQuantity = filteredOrders.reduce((sum, order) => {
      return sum + getOrderQuantity(order);
    }, 0);

    const importPrice = post.import_price || 0;
    const totalImportCost = importPrice * totalQuantity;
    return Math.max(0, totalOrderValue - totalImportCost);
  };

  const totalRevenue = calculateTotalRevenue();

  // Calculate NEW orders quantity by type
  const calculateNewOrdersByType = () => {
    if (!filteredOrders) return {};

    return filteredOrders.reduce((acc, order) => {
      if (order.status_code === 'NEW') {
        const type = getOrderType(order) || 'Mặt hàng khác';
        const quantity = getOrderQuantity(order);
        acc[type] = (acc[type] || 0) + quantity;
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
        title: 'Thành công',
        description: 'Cập nhật giá nhập thành công',
          });
        },
        onError: (error: any) => {
          toast({
        title: 'Lỗi',
        description: typeof error.detail === 'string' ? error.detail : 'Không thể cập nhật giá nhập',
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
        description: typeof error.detail === 'string' ? error.detail : t.errors.unknownError,
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
        title: 'Thành công',
        description: 'Tạo đơn hàng thành công',
      });
      setCreateOrderModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: typeof error.detail === 'string' ? error.detail : 'Không thể tạo đơn hàng',
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
        title: 'Thành công',
        description: 'Cập nhật đơn hàng thành công',
      });
      setIsEditOrderModalOpen(false);
      setSelectedOrder(null);
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: typeof error.detail === 'string' ? error.detail : 'Không thể cập nhật đơn hàng',
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
        title: 'Thành công',
        description: 'Xóa đơn hàng thành công',
      });
      setIsDeleteOrderDialogOpen(false);
      setOrderToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: typeof error.detail === 'string' ? error.detail : 'Không thể xóa đơn hàng',
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
        title: 'Thành công',
        description: 'Cập nhật sản phẩm thành công',
      });
      setIsItemManagementModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: typeof error.detail === 'string' ? error.detail : 'Không thể cập nhật sản phẩm',
        variant: 'destructive',
      });
    }
  };

  const handleSplitOrder = (order: Order) => {
    setOrderToSplit(order);
    setIsSplitOrderModalOpen(true);
  };

  const handleOrderSelect = (orderId: string, checked: boolean) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(filteredOrders.map(order => order.order_id || getOrderCommentId(order) || '')));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleBatchStatusUpdate = (statusDisplayName: string) => {
    if (selectedOrders.size === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một đơn hàng để cập nhật",
        variant: "destructive",
      });
      return;
    }

    const statusCode = findStatusCodeByDisplayName(statusDisplayName);
    if (!statusCode) {
      toast({
        title: "Lỗi",
        description: `Không tìm thấy trạng thái: ${statusDisplayName}`,
        variant: "destructive",
      });
      return;
    }

    const selectedOrdersData = filteredOrders.filter(order =>
      selectedOrders.has(order.order_id || getOrderCommentId(order) || '')
    );

    setOrdersToUpdate(selectedOrdersData);
    setNewStatusCode(statusCode);
    setShowBatchUpdateDialog(true);
  };

  const handleBatchUpdateConfirm = async () => {
    if (!selectedGroupId || !selectedPostId || ordersToUpdate.length === 0) return;

    try {
      const updatePromises = ordersToUpdate.map(order =>
        updateOrderStatusMutation.mutateAsync({
          groupId: selectedGroupId,
          postId: selectedPostId,
          orderId: order.order_id || getOrderCommentId(order) || '',
          data: {
            new_status_code: newStatusCode,
            note: `Trạng thái được cập nhật thành ${getStatusDisplayName(newStatusCode)}`,
            actor: user?.username || 'System'
          }
        })
      );

      await Promise.all(updatePromises);

      // Clear selections
      setSelectedOrders(new Set());
      setShowBatchUpdateDialog(false);
      setOrdersToUpdate([]);
      setNewStatusCode('');

      // Show success message
      toast({
        title: "Thành công",
        description: `Đã cập nhật ${ordersToUpdate.length} đơn hàng thành trạng thái ${getStatusDisplayName(newStatusCode)}`,
      });

      // Refetch data to update the UI
      refetch();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Lỗi",
        description: error.detail || "Có lỗi xảy ra khi cập nhật trạng thái đơn hàng",
        variant: "destructive",
      });
    }
  };

  const handleBatchUpdateCancel = () => {
    setShowBatchUpdateDialog(false);
    setOrdersToUpdate([]);
    setNewStatusCode('');
  };

  const handleSplitOrderSubmit = async (splitQuantity: number, newStatus: string) => {
    if (!selectedGroupId || !selectedPostId || !orderToSplit) return;

    try {
      await splitOrderMutation.mutateAsync({
        groupId: selectedGroupId,
        postId: selectedPostId,
        orderId: orderToSplit.order_id || getOrderCommentId(orderToSplit) || '',
        data: {
          split_quantity: splitQuantity,
          new_status_code: newStatus,
          note: `Chia từ đơn hàng gốc`
        }
      });

      toast({
        title: 'Thành công',
        description: `Chia đơn hàng thành công. Đã tạo đơn hàng mới với ${splitQuantity} sản phẩm.`,
      });

      setIsSplitOrderModalOpen(false);
      setOrderToSplit(null);
    } catch (error: any) {
      console.error('Split order error:', error);

      let errorMessage = 'Không thể chia đơn hàng';
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) =>
            `${err.loc?.join('.') || 'field'}: ${err.msg}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      } else if (typeof error.detail === 'string') {
        errorMessage = error.detail;
      }

      toast({
        title: 'Lỗi',
        description: errorMessage,
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
                <div className="flex items-center space-x-4">
                  <div>
                    <DrawerTitle className="text-lg sm:text-xl">Đơn hàng - Post #{selectedPostId}</DrawerTitle>
                    <DrawerDescription className="text-sm">
                      {filteredOrders.length} {t.common.order.toLowerCase()}
                    </DrawerDescription>
                  </div>
                  {post?.local_images && post.local_images.length > 0 && (
                    <div>
                      <ImageGallery
                        images={post.local_images}
                        postId={post.id}
                        maxDisplay={3}
                      />
                    </div>
                  )}
                </div>

                {/* Post Details */}
                {isPostLoading ? (
                  <div className="mt-4 flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading post details...</span>
                  </div>
                ) : post ? (
                  <div className="mt-4 space-y-3">
                    {/* Import Price - Admin Only */}
                    {isAdmin && (
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Giá nhập:</h4>
                        {isEditingImportPrice ? (
                          <>
                            <Input
                              type="number"
                              value={importPriceValue}
                              onChange={(e) => setImportPriceValue(e.target.value)}
                              placeholder="Enter import price"
                              className="h-8 text-sm w-32"
                            />
                            <Button
                              size="sm"
                              onClick={handleSaveImportPrice}
                              className="h-8 px-3"
                              disabled={updatePostMutation.isPending}
                            >
                              {updatePostMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEditImportPrice}
                              className="h-8 px-3"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-green-600">
                              {post.import_price ? (
                                new Intl.NumberFormat('vi-VN', {
                                  style: 'currency',
                                  currency: 'VND'
                                }).format(post.import_price)
                              ) : (
                                <span className="text-muted-foreground">Chưa có giá nhập</span>
                              )}
                            </p>
                            <Button
                              size="sm"
                              onClick={handleEditImportPrice}
                              className="h-6 px-2"
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Sửa
                            </Button>
                          </>
                        )}
                      </div>
                    )}


                    {/* Post Description */}
                    {post.description && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Description:</h4>
                        <p className="text-sm line-clamp-3">{post.description}</p>
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
                        .sort(([, a], [, b]) => b - a) // Sort by quantity descending
                        .map(([type, quantity]) => (
                          <div key={type} className="text-sm">
                            {type}: {quantity}
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

              </div>
            </div>

          </DrawerHeader>

          <div className="flex-1 overflow-auto p-4 sm:p-6">
            {/* Filters and Action Buttons */}
            <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0 lg:space-x-4">
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

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <Button onClick={() => refetch()} className="w-full sm:w-auto">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t.common.refresh}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsItemManagementModalOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Quản lý sản phẩm
                </Button>
                <Button onClick={handleCreateOrder} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  {t.posts.createOrder}
                </Button>
              </div>
            </div>

            {/* Batch Update Buttons */}
            {selectedOrders.size > 0 && (
              <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-orders"
                    checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all-orders" className="text-sm font-medium">
                    Chọn tất cả ({selectedOrders.size} đã chọn)
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchStatusUpdate('Hàng đã về')}
                    disabled={selectedOrders.size === 0}
                  >
                    Hàng đã về ({selectedOrders.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchStatusUpdate('Dồn đơn')}
                    disabled={selectedOrders.size === 0}
                  >
                    Dồn đơn ({selectedOrders.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchStatusUpdate('Đang vận chuyển')}
                    disabled={selectedOrders.size === 0}
                  >
                    Đang vận chuyển ({selectedOrders.size})
                  </Button>
                </div>
              </div>
            )}

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
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
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
                      {filteredOrders.map((order) => {
                        const orderId = order.order_id || getOrderCommentId(order) || '';
                        const isSelected = selectedOrders.has(orderId);
                        return (
                        <TableRow key={orderId}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleOrderSelect(orderId, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto font-normal text-left justify-start truncate max-w-32"
                                onClick={() => window.open(getOrderCustomerUrl(order), '_blank')}
                              >
                                {getOrderCustomerName(order)}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(getOrderCustomerUrl(order), '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{t.currency.formatNumber(getOrderQuantity(order))}</TableCell>
                          <TableCell>{getOrderType(order)}</TableCell>
                          <TableCell>
                            {getOrderPriceCalc(order) ?
                              t.currency.format(getOrderTotalPrice(order)) :
                              '—'
                            }
                          </TableCell>
                          <TableCell>
                            <Select
                              value={order.status_code || undefined}
                              onValueChange={(value: string) => handleStatusChange(
                                order.order_id || getOrderCommentId(order) || '',
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
                            <div className="max-w-32">
                              <div className="truncate" title={order.note || ''}>
                                {order.note || '—'}
                              </div>
                              {order.note_images && order.note_images.length > 0 && (
                                <div className="mt-1">
                                  <ImageGallery
                                    images={order.note_images}
                                    title="Ảnh ghi chú"
                                    postId={order.order_id}
                                    maxDisplay={3}
                                  />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSplitOrder(order)}
                                title="Chia đơn hàng"
                              >
                                <Split className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditOrder(order)}
                                title="Sửa đơn hàng"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteOrder(order)}
                                  title="Xóa đơn hàng"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {filteredOrders.map((order) => {
                    const orderId = order.order_id || getOrderCommentId(order) || '';
                    const isSelected = selectedOrders.has(orderId);
                    return (
                    <div key={orderId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleOrderSelect(orderId, checked as boolean)}
                            />
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto font-medium text-left justify-start text-blue-600 hover:text-blue-800"
                              onClick={() => window.open(getOrderCustomerUrl(order), '_blank')}
                            >
                              <span className="truncate text-sm sm:text-base">
                                {getOrderCustomerName(order)}
                              </span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 flex-shrink-0"
                              onClick={() => window.open(getOrderCustomerUrl(order), '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Số lượng:</span>
                              <span className="font-medium">{t.currency.formatNumber(getOrderQuantity(order))}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Loại:</span>
                              <span className="font-medium">{getOrderType(order)}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tổng cộng:</span>
                              <span className="font-medium">
                                {getOrderPriceCalc(order) ?
                                  t.currency.format(getOrderTotalPrice(order)) :
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
                            {order.note_images && order.note_images.length > 0 && (
                              <div>
                                <span className="text-muted-foreground text-xs">Ảnh:</span>
                                <div className="mt-1">
                                  <ImageGallery
                                    images={order.note_images}
                                    title="Ảnh ghi chú"
                                    postId={order.order_id}
                                    maxDisplay={3}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSplitOrder(order)}
                              className="h-8 w-8 p-0"
                              title="Chia đơn hàng"
                            >
                              <Split className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditOrder(order)}
                              className="h-8 w-8 p-0"
                              title="Sửa đơn hàng"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteOrder(order)}
                                className="h-8 w-8 p-0"
                                title="Xóa đơn hàng"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Select
                          value={order.status_code || undefined}
                          onValueChange={(value: string) => handleStatusChange(
                            order.order_id || getOrderCommentId(order) || '',
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
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Batch Update Confirmation Dialog with Preview */}
      <AlertDialog open={showBatchUpdateDialog} onOpenChange={setShowBatchUpdateDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Cập nhật trạng thái đơn hàng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có muốn cập nhật {ordersToUpdate.length} đơn hàng đã chọn thành trạng thái "{getStatusDisplayName(newStatusCode)}" không?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4">
            <h4 className="text-sm font-semibold mb-2">Danh sách đơn hàng sẽ được cập nhật:</h4>
            <div className="border rounded-md max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">STT</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Tổng cộng</TableHead>
                    <TableHead>Trạng thái hiện tại</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersToUpdate.map((order: Order, index: number) => (
                    <TableRow key={order.order_id || getOrderCommentId(order)}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="truncate max-w-32">
                          {getOrderCustomerName(order)}
                        </div>
                      </TableCell>
                      <TableCell>{getOrderQuantity(order)}</TableCell>
                      <TableCell>{getOrderType(order)}</TableCell>
                      <TableCell>
                        {getOrderPriceCalc(order) ?
                          t.currency.format(getOrderTotalPrice(order)) :
                          '—'
                        }
                      </TableCell>
                      <TableCell>{getStatusDisplayName(order.status_code || '')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleBatchUpdateCancel} disabled={updateOrderStatusMutation.isPending}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchUpdateConfirm}
              disabled={updateOrderStatusMutation.isPending}
            >
              {updateOrderStatusMutation.isPending ? 'Đang cập nhật...' : 'Xác nhận'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <SplitOrderModal
        open={isSplitOrderModalOpen}
        onOpenChange={setIsSplitOrderModalOpen}
        order={orderToSplit}
        onSplit={handleSplitOrderSubmit}
        loading={splitOrderMutation.isPending}
      />
    </>
  );
};
