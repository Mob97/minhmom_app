import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAppStore } from '@/store/app-store';
import { useUserOrdersWithStats, useStatuses, useUpdateOrderStatus, useUpdateOrder, useDeleteOrder } from '@/hooks/use-api';
import { X, ExternalLink, Printer, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { EditOrderModal } from './EditOrderModal';
import { DeleteOrderDialog } from './DeleteOrderDialog';
import type { Order } from '@/types/api';
import {
  getOrderQuantity,
  getOrderType,
  getOrderTotalPrice,
  getOrderPriceCalc,
  getOrderCommentUrl,
  getOrderCommentCreatedTime,
  getOrderCommentId
} from '@/types/api';

interface UserOrdersDrawerProps {
  showAllOrders?: boolean;
}

export const UserOrdersDrawer: React.FC<UserOrdersDrawerProps> = ({ showAllOrders = false }) => {
  const { user } = useAuth();
  const {
    isUserOrdersDrawerOpen,
    setUserOrdersDrawerOpen,
    selectedUserId
  } = useAppStore();

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showAllOrdersLocal, setShowAllOrdersLocal] = useState(showAllOrders);
  const [showStatusUpdateDialog, setShowStatusUpdateDialog] = useState(false);
  const [ordersToUpdate, setOrdersToUpdate] = useState<Array<{ orderId: string; postId: string }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50; // Fixed page size for now
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDeleteOrderDialogOpen, setIsDeleteOrderDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  const { selectedGroupId } = useAppStore();

  // Sync local state with prop changes
  useEffect(() => {
    setShowAllOrdersLocal(showAllOrders);
  }, [showAllOrders]);

  // Reset pagination when user changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedOrders(new Set());
  }, [selectedUserId]);

  // Get user data with orders and statistics (optimized endpoint)
  const { data: userData, refetch: refetchUserOrders } = useUserOrdersWithStats(
    selectedUserId || '',
    selectedGroupId || '',
    currentPage,
    pageSize
  );

  // Get statuses for display names
  const { data: statuses } = useStatuses({ active: true });

  // Mutation for updating order status
  const updateOrderStatusMutation = useUpdateOrderStatus();
  const updateOrderMutation = useUpdateOrder();
  const deleteOrderMutation = useDeleteOrder();
  const { toast } = useToast();

  const isAdmin = user?.role === 'admin';

  // Helper function to get status display name
  const getStatusDisplayName = (statusCode: string) => {
    const status = statuses?.find(s => s.status_code === statusCode);
    return status?.display_name || statusCode;
  };


  // Filter orders based on local showAllOrders state
  const filteredOrders = userData?.orders?.filter((orderData: { order: Order; post_id: string; post_description: string }) => {
    if (showAllOrdersLocal) {
      return true; // Show all orders
    }
    const status = orderData.order?.status_code || '';
    return status !== 'DONE' && status !== 'CANCELLED';
  }) || [];

  // Statistics are now calculated on the backend and provided directly
  const totalRevenue = userData?.total_revenue || 0;
  const cancelledOrdersCount = userData?.cancelled_orders_count || 0;

  const handleClose = () => {
    setUserOrdersDrawerOpen(false);
    setSelectedOrders(new Set());
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
      setSelectedOrders(new Set(filteredOrders.map((orderData: { order: Order; post_id: string; post_description: string }) => orderData.order?.order_id || '')));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const handlePrintSelectedOrders = () => {
    if (selectedOrders.size === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một đơn hàng để in",
        variant: "destructive",
      });
      return;
    }

    const selectedOrdersData = filteredOrders.filter((orderData: { order: Order; post_id: string; post_description: string }) =>
      selectedOrders.has(orderData.order?.order_id || '')
    );

    // Calculate total amount
    const totalAmount = selectedOrdersData.reduce((sum, orderData) => {
      return sum + getOrderTotalPrice(orderData.order);
    }, 0);

    // Create print content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hóa đơn - ${userData?.name || userData?.fb_uid || 'Khách hàng'}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .customer-info {
            margin-bottom: 20px;
          }
          .customer-info h3 {
            margin: 0 0 10px 0;
            color: #333;
          }
          .customer-info p {
            margin: 2px 0;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .total-section {
            text-align: right;
            margin-top: 20px;
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 10px;
          }
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
          }
          .print-button:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">In hóa đơn</button>

        <div class="header">
          <h1>HÓA ĐƠN BÁN HÀNG</h1>
          <p>Ngày in: ${new Date().toLocaleDateString('vi-VN')}</p>
        </div>

        <div class="customer-info">
          <h3>Thông tin khách hàng</h3>
          <p><strong>Tên:</strong> ${userData?.name || '—'}</p>
          <p><strong>Địa chỉ:</strong> ${userData?.addresses && userData.addresses.length > 0 ? userData.addresses[0] : '—'}</p>
          <p><strong>Số điện thoại:</strong> ${userData?.phone_number || '—'}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên sản phẩm</th>
              <th>Số lượng</th>
              <th>Loại</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${selectedOrdersData.map((orderData: { order: Order; post_id: string; post_description: string }, index: number) => {
              const order = orderData.order;
              const total = getOrderTotalPrice(order);
              const qty = getOrderQuantity(order);
              const unitPrice = qty > 0 ? total / qty : 0;

              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${order?.item?.item_name || order?.matched_item?.name || '—'}</td>
                  <td>${qty}</td>
                  <td>${getOrderType(order)}</td>
                  <td>${formatCurrency(unitPrice)}</td>
                  <td>${formatCurrency(total)}</td>
                  <td>${getStatusDisplayName(order?.status_code || '')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <p>Tổng cộng: ${formatCurrency(totalAmount)}</p>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #666;">
          <p>Cảm ơn quý khách đã mua hàng!</p>
        </div>
      </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      // Auto-print after a short delay
      setTimeout(() => {
        printWindow.print();
        // Show status update dialog after printing
        setTimeout(() => {
          setOrdersToUpdate(selectedOrdersData.map((orderData: { order: Order; post_id: string; post_description: string }) => ({
            orderId: orderData.order?.order_id || '',
            postId: orderData.post_id
          })));
          setShowStatusUpdateDialog(true);
        }, 1000);
      }, 500);
    }
  };

  const handleStatusUpdateConfirm = async () => {
    if (!selectedGroupId) return;

    try {
      // Update all selected orders to DONE status
      const updatePromises = ordersToUpdate.map(({ orderId, postId }) =>
        updateOrderStatusMutation.mutateAsync({
          groupId: selectedGroupId,
          postId,
          orderId,
          data: {
            new_status_code: 'DONE',
            note: 'Đơn hàng đã được in hóa đơn',
            actor: user?.username || 'System'
          }
        })
      );

      await Promise.all(updatePromises);

      // Clear selections and close dialog
      setSelectedOrders(new Set());
      setShowStatusUpdateDialog(false);
      setOrdersToUpdate([]);

      // Show success message
      toast({
        title: "Thành công",
        description: `Đã cập nhật ${ordersToUpdate.length} đơn hàng thành trạng thái DONE`,
      });

      // Refetch data to update the UI
      refetchUserOrders();

    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi cập nhật trạng thái đơn hàng",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdateCancel = () => {
    setShowStatusUpdateDialog(false);
    setOrdersToUpdate([]);
  };

  const handleBatchStatusUpdate = async (newStatusCode: string) => {
    if (selectedOrders.size === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một đơn hàng để cập nhật",
        variant: "destructive",
      });
      return;
    }

    if (!selectedGroupId) {
      toast({
        title: 'Lỗi cập nhật trạng thái',
        description: 'Không tìm thấy Group ID',
        variant: 'destructive',
      });
      return;
    }

    const selectedOrdersData = filteredOrders.filter((orderData: { order: Order; post_id: string; post_description: string }) =>
      selectedOrders.has(orderData.order?.order_id || '')
    );

    try {
      // Update all selected orders to the new status
      const updatePromises = selectedOrdersData.map((orderData: { order: Order; post_id: string; post_description: string }) =>
        updateOrderStatusMutation.mutateAsync({
          groupId: selectedGroupId,
          postId: orderData.post_id,
          orderId: orderData.order?.order_id || '',
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

      // Show success message
      toast({
        title: "Thành công",
        description: `Đã cập nhật ${selectedOrdersData.length} đơn hàng thành trạng thái ${getStatusDisplayName(newStatusCode)}`,
      });

      // Refetch data to update the UI
      refetchUserOrders();

    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi cập nhật trạng thái đơn hàng",
        variant: "destructive",
      });
    }
  };




  const handleStatusChange = async (order: Order, newStatus: string) => {
    if (newStatus === order.status_code) {
      return; // No change needed
    }

    if (!selectedGroupId) {
      toast({
        title: 'Lỗi cập nhật trạng thái',
        description: 'Không tìm thấy Group ID',
        variant: 'destructive',
      });
      return;
    }

    // Find the orderData to get the post_id
    const orderData = filteredOrders.find((orderData: { order: Order; post_id: string; post_description: string }) =>
      orderData.order?.order_id === order.order_id
    );

    if (!orderData) {
      toast({
        title: 'Lỗi cập nhật trạng thái',
        description: 'Không tìm thấy thông tin đơn hàng',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateOrderStatusMutation.mutateAsync({
        groupId: selectedGroupId,
        postId: orderData.post_id,
        orderId: order.order_id,
        data: {
          new_status_code: newStatus,
          note: `Trạng thái được cập nhật từ ${getStatusDisplayName(order.status_code)} thành ${getStatusDisplayName(newStatus)}`,
          actor: user?.username || 'System'
        }
      });

      toast({
        title: 'Cập nhật trạng thái thành công',
        description: `Đơn hàng ${order.order_id} đã được cập nhật thành ${getStatusDisplayName(newStatus)}`,
      });

      // Refetch data to update the UI
      refetchUserOrders();
    } catch (error: any) {
      toast({
        title: 'Lỗi cập nhật trạng thái',
        description: error.detail || 'Không thể cập nhật trạng thái đơn hàng',
        variant: 'destructive',
      });
    }
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsEditOrderModalOpen(true);
  };

  const handleUpdateOrder = async (data: any) => {
    if (!selectedGroupId || !selectedOrder) return;

    // Find the orderData to get the post_id
    const orderData = filteredOrders.find((orderData: { order: Order; post_id: string; post_description: string }) =>
      orderData.order?.order_id === selectedOrder.order_id
    );

    if (!orderData) {
      toast({
        title: 'Lỗi cập nhật đơn hàng',
        description: 'Không tìm thấy thông tin đơn hàng',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateOrderMutation.mutateAsync({
        groupId: selectedGroupId,
        postId: orderData.post_id,
        orderId: selectedOrder.order_id || getOrderCommentId(selectedOrder) || '',
        data
      });
      toast({
        title: 'Thành công',
        description: 'Đơn hàng đã được cập nhật thành công',
      });
      setIsEditOrderModalOpen(false);
      setSelectedOrder(null);
      // Refetch data to update the UI
      refetchUserOrders();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.detail || 'Không thể cập nhật đơn hàng',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteOrder = (order: Order) => {
    setOrderToDelete(order);
    setIsDeleteOrderDialogOpen(true);
  };

  const handleConfirmDeleteOrder = async (orderId: string) => {
    if (!selectedGroupId || !orderToDelete) return;

    // Find the orderData to get the post_id
    const orderData = filteredOrders.find((orderData: { order: Order; post_id: string; post_description: string }) =>
      orderData.order?.order_id === orderToDelete.order_id
    );

    if (!orderData) {
      toast({
        title: 'Lỗi xóa đơn hàng',
        description: 'Không tìm thấy thông tin đơn hàng',
        variant: 'destructive',
      });
      return;
    }

    try {
      await deleteOrderMutation.mutateAsync({
        groupId: selectedGroupId,
        postId: orderData.post_id,
        orderId
      });
      toast({
        title: 'Thành công',
        description: 'Đơn hàng đã được xóa thành công',
      });
      setIsDeleteOrderDialogOpen(false);
      setOrderToDelete(null);
      // Refetch data to update the UI
      refetchUserOrders();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.detail || 'Không thể xóa đơn hàng',
        variant: 'destructive',
      });
    }
  };

  if (!userData) {
    return null;
  }

  return (
    <Drawer open={isUserOrdersDrawerOpen} onOpenChange={setUserOrdersDrawerOpen}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-xl">
                {userData.name || userData.fb_uid}
              </DrawerTitle>
              <DrawerDescription>
                Thông tin chi tiết và đơn hàng của người dùng
              </DrawerDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-6 overflow-y-auto">
          {/* User Information and Admin Stats in separate cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Information Card - takes 2/3 of the width */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Thông tin người dùng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  {/* <label className="text-sm font-medium text-muted-foreground">Facebook UID</label>
                  <p className="text-sm" >{userData.fb_uid}</p> */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tên khách hàng: </label>
                    <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto"
                        onClick={() => window.open(userData.fb_url, '_blank')}
                      >
                      <p className="text-sm">{ userData.name || '—'}</p>
                        {/* {userData.name || '—'} */}
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {/* {userData.fb_url} */}
                      </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Địa chỉ</label>
                  <p className="text-sm">{userData.addresses && userData.addresses.length > 0 ? userData.addresses[0] : '—'}</p>
                  {userData.addresses && userData.addresses.length > 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      +{userData.addresses.length - 1} địa chỉ khác
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Số điện thoại</label>
                  <p className="text-sm">{userData.phone_number || '—'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Admin Statistics Card */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thống kê (Admin)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Tổng số đơn hàng</label>
                      <p className="text-2xl font-bold">{userData.order_count}</p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Tổng doanh thu</label>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(totalRevenue)}
                      </p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Đơn hàng đã hủy</label>
                      <p className="text-2xl font-bold text-red-600">
                        {cancelledOrdersCount}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Orders Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Đơn hàng: ({userData?.pagination?.total || 0})
                </h3>
              <div className="flex items-center space-x-4">
                {/* Show All Orders Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-all-orders"
                    checked={showAllOrdersLocal}
                    onCheckedChange={(checked) => setShowAllOrdersLocal(checked as boolean)}
                  />
                  <label
                    htmlFor="show-all-orders"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Hiển thị tất cả đơn hàng
                  </label>
                </div>

                {/* Select All Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm">
                    Chọn tất cả
                  </label>
                </div>

                {/* Batch Update Buttons */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchStatusUpdate('WAITING_FOR_PAYMENT')}
                  disabled={selectedOrders.size === 0}
                  className="flex items-center space-x-2"
                >
                  <span>Chờ thanh toán ({selectedOrders.size})</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchStatusUpdate('DONE')}
                  disabled={selectedOrders.size === 0}
                  className="flex items-center space-x-2"
                >
                  <span>Hoàn thành ({selectedOrders.size})</span>
                </Button>

                {/* Print Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintSelectedOrders}
                  disabled={selectedOrders.size === 0}
                  className="flex items-center space-x-2"
                >
                  <Printer className="h-4 w-4" />
                  <span>In hóa đơn ({selectedOrders.size})</span>
                </Button>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {showAllOrdersLocal ? 'Không có đơn hàng nào' : 'Không có đơn hàng đang xử lý'}
                </p>
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-96">Tên sản phẩm</TableHead>
                      <TableHead className="w-24">Số lượng</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead className="w-40">Tổng cộng</TableHead>
                      <TableHead className="w-48">Trạng thái</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      <TableHead className="w-36">Thời gian</TableHead>
                      <TableHead className="text-right w-40">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((orderData: { order: Order; post_id: string; post_description: string }) => {
                      const order = orderData.order;
                      const orderId = order?.order_id || '';
                      const isSelected = selectedOrders.has(orderId);

                      return (
                        <TableRow key={orderId}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleOrderSelect(orderId, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="w-48">
                            <div className="truncate">
                              {(order?.item?.item_name || order?.matched_item?.name) ? (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="p-0 h-auto text-left justify-start truncate"
                                  onClick={() => window.open(getOrderCommentUrl(order) || '#', '_blank')}
                                >
                                  {order?.item?.item_name || order?.matched_item?.name}
                                </Button>
                              ) : (
                                '—'
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="w-20">{getOrderQuantity(order)}</TableCell>
                          <TableCell>{getOrderType(order)}</TableCell>
                          <TableCell className="w-24">
                            {getOrderPriceCalc(order) ? formatCurrency(getOrderTotalPrice(order)) : '—'}
                          </TableCell>
                          <TableCell className="w-48">
                            <Select
                              value={order?.status_code || undefined}
                              onValueChange={(value: string) => handleStatusChange(order, value)}
                              disabled={updateOrderStatusMutation.isPending}
                            >
                              <SelectTrigger className="w-full">
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
                            <div className="max-w-32 truncate" title={order?.note || ''}>
                              {order?.note || '—'}
                            </div>
                          </TableCell>
                          <TableCell className="w-32">
                            <div className="text-xs">
                              {formatDateTime(getOrderCommentCreatedTime(order))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right w-20">
                            <div className="flex items-center justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditOrder(order)}
                                disabled={updateOrderMutation.isPending}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteOrder(order)}
                                  className="text-destructive hover:text-destructive"
                                  disabled={deleteOrderMutation.isPending}
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
              </Card>
            )}

            {/* Pagination Controls */}
            {userData?.pagination && userData.pagination.total_pages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    Hiển thị {((userData.pagination.page - 1) * userData.pagination.page_size) + 1} - {Math.min(userData.pagination.page * userData.pagination.page_size, userData.pagination.total)} trong tổng số {userData.pagination.total} đơn hàng
                  </span>
                </div>
                <Pagination
                  currentPage={userData.pagination.page}
                  totalPages={userData.pagination.total_pages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </div>
      </DrawerContent>

      {/* Status Update Confirmation Dialog */}
      <AlertDialog open={showStatusUpdateDialog} onOpenChange={setShowStatusUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cập nhật trạng thái đơn hàng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có muốn cập nhật {ordersToUpdate.length} đơn hàng đã chọn thành trạng thái "DONE" không?
              <br />
              <br />
              Hành động này sẽ đánh dấu các đơn hàng là đã hoàn thành.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStatusUpdateCancel}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusUpdateConfirm}
              disabled={updateOrderStatusMutation.isPending}
            >
              {updateOrderStatusMutation.isPending ? 'Đang cập nhật...' : 'Xác nhận'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </Drawer>
  );
};