import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useAppStore } from '@/store/app-store';
import { useOrders, useStatuses, usePost, useUpdatePost } from '@/hooks/use-api';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Plus, ExternalLink, Eye, Edit2 } from 'lucide-react';
import { CreateOrderModal } from './CreateOrderModal';
import { useToast } from '@/hooks/use-toast';
import { useUpdateOrderStatus } from '@/hooks/use-api';
import { ImageGallery } from '@/components/ui/image-gallery';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';

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
  const updatePostMutation = useUpdatePost();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [isEditingImportPrice, setIsEditingImportPrice] = useState(false);
  const [importPriceValue, setImportPriceValue] = useState('');

  const filteredOrders = orders?.filter(order =>
    !ordersStatusFilter || ordersStatusFilter === "all" || order.status_code === ordersStatusFilter
  ) || [];

  const getStatusDisplayName = (statusCode: string) => {
    const status = statuses?.find(s => s.status_code === statusCode);
    return status?.display_name || statusCode;
  };

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

  if (!selectedPostId) {
    return null;
  }

  return (
    <>
      <Drawer open={isOrdersDrawerOpen} onOpenChange={setOrdersDrawerOpen}>
        <DrawerContent className="h-[80vh]">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DrawerTitle>Đơn hàng - Post #{selectedPostId}</DrawerTitle>
                <DrawerDescription>
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
                        <p className="text-sm">{post.description}</p>
                      </div>
                    )}

                     {/* Import Price - Admin Only */}
                     {isAdmin && (
                       <div>
                         <h4 className="text-sm font-medium text-muted-foreground mb-1">Import Price:</h4>

                         {isEditingImportPrice ? (
                           <div className="flex items-center space-x-1">
                             <Input
                               type="number"
                               value={importPriceValue}
                               onChange={(e) => setImportPriceValue(e.target.value)}
                               placeholder="Enter import price"
                               className="h-8 text-sm w-48"
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
                          </div>
                         ) : (
                           <div className="flex items-center space-x-2">
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
                               className="h-6 px-2"
                             >
                               <Edit2 className="h-3 w-3" />
                             </Button>
                           </div>
                         )}
                       </div>
                     )}

                    {/* Post Items */}
                    {post.items && post.items.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Items:</h4>
                        <div className="space-y-1">
                          {post.items.map((item, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Badge variant="outline">{item.name || 'Unnamed Item'}</Badge>
                              {item.type && <span className="text-xs text-muted-foreground">({item.type})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Post Images */}
                    {post.local_images && post.local_images.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Images:</h4>
                        <ImageGallery
                          images={post.local_images}
                          postId={post.id}
                          maxDisplay={4}
                        />
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col items-end space-y-2 ml-4">
                {/* Revenue Display */}
                {isAdmin && post?.import_price && (
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                    <div className="text-2xl font-bold text-green-600">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(totalRevenue)}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <Button onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t.common.refresh}
                  </Button>
                  <Button onClick={handleCreateOrder}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t.posts.createOrder}
                  </Button>
                </div>
              </div>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-auto p-6">
            {/* Filters */}
            <div className="mb-4 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Lọc theo trạng thái:</span>
                <Select value={ordersStatusFilter || "all"} onValueChange={setOrdersStatusFilter}>
                  <SelectTrigger className="w-48">
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.posts.commentId}</TableHead>
                      <TableHead>{t.common.user}</TableHead>
                      <TableHead>{t.common.quantity}</TableHead>
                      <TableHead>{t.common.type}</TableHead>
                      <TableHead>{t.common.total}</TableHead>
                      <TableHead>{t.common.status}</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      <TableHead className="text-right">{t.common.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.order_id || order.comment_id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {order.order_id || order.comment_id}
                            </Badge>
                            {order.comment_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(order.comment_url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
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
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              {getStatusDisplayName(order.status_code)}
                            </Badge>
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
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-32 truncate" title={order.note || ''}>
                            {order.note || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <CreateOrderModal
        open={isCreateOrderModalOpen}
        onOpenChange={setCreateOrderModalOpen}
        onSubmit={() => {}}
      />
    </>
  );
};
