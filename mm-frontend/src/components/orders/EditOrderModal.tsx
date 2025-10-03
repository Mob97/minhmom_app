import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/app-store';
import { useStatuses, usePost } from '@/hooks/use-api';
import { t } from '@/lib/i18n';
import type { Order, UpdateOrderRequest } from '@/types/api';
import {
  getOrderCustomerName,
  getOrderCustomerUrl,
  getOrderQuantity,
  getOrderType,
  getOrderCommentUrl,
  getOrderCommentText,
  getOrderAddress,
  getOrderPhoneNumber,
  getOrderTotalPrice
} from '@/types/api';

interface EditOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateOrderRequest) => void;
  order: Order | null;
  loading?: boolean;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  order,
  loading = false,
}) => {
  const { selectedPostId, selectedGroupId } = useAppStore();
  const { data: statuses } = useStatuses({ active: true });
  const { data: postData } = usePost(selectedGroupId || '', selectedPostId || '');

  // Money formatting functions
  const formatMoney = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    // Use spaces as thousand separators instead of dots
    return num.toLocaleString('en-US').replace(/,/g, ' ');
  };

  const parseMoney = (value: string): number => {
    // Remove all spaces (we use spaces as thousand separators)
    const cleaned = value.replace(/\s/g, '');
    return parseFloat(cleaned) || 0;
  };

  const [formData, setFormData] = useState({
    url: '',
    qty: '',
    type: '',
    currency: 'VND',
    status_code: '',
    note: '',
    user_name: '',
    user_address: '',
    user_phone: '',
    unit_price: '',
    total_price: '',
    selected_item_id: '',
  });
  const [isTypingTotalPrice, setIsTypingTotalPrice] = useState(false);

  // Update form data when order changes
  useEffect(() => {
    if (order) {
      setFormData({
        url: getOrderCustomerUrl(order) || '',
        qty: getOrderQuantity(order)?.toString() || '',
        type: getOrderType(order) || '',
        currency: order.currency || 'VND',
        status_code: order.status_code || '',
        note: order.note || '',
        user_name: getOrderCustomerName(order) || '',
        user_address: getOrderAddress(order) || '',
        user_phone: getOrderPhoneNumber(order) || '',
        unit_price: formatMoney(order?.item?.unit_price || 0),
        total_price: formatMoney(getOrderTotalPrice(order) || 0),
        selected_item_id: order?.item?.item_id?.toString() || '',
      });
    }
  }, [order]);

  // Recalculate total price when quantity changes (based on current unit price)
  useEffect(() => {
    if (formData.qty && formData.unit_price && !isTypingTotalPrice) {
      const qty = parseFloat(formData.qty) || 0;
      const unitPrice = parseMoney(formData.unit_price);
      const totalPrice = unitPrice * qty;

      setFormData(prev => ({
        ...prev,
        total_price: formatMoney(totalPrice)
      }));
    }
  }, [formData.qty, formData.unit_price, isTypingTotalPrice]);

  // Handle unit price change - calculate total price
  const handleUnitPriceChange = (value: string) => {
    // Parse the input value to get the numeric value
    const unitPrice = parseMoney(value);
    const qty = parseFloat(formData.qty) || 0;
    const totalPrice = unitPrice * qty;

    setFormData(prev => ({
      ...prev,
      unit_price: value, // Keep the raw input while typing
      total_price: formatMoney(totalPrice)
    }));
  };

  // Handle total price change - allow free typing, calculate unit price on blur
  const handleTotalPriceChange = (value: string) => {
    setIsTypingTotalPrice(true);
    setFormData(prev => ({
      ...prev,
      total_price: value // Don't format while typing
    }));
  };

  // Handle unit price blur - format the value when user finishes typing
  const handleUnitPriceBlur = () => {
    const unitPrice = parseMoney(formData.unit_price);
    setFormData(prev => ({
      ...prev,
      unit_price: formatMoney(unitPrice)
    }));
  };

  // Handle total price blur - calculate unit price when user finishes typing
  const handleTotalPriceBlur = () => {
    setIsTypingTotalPrice(false);
    const totalPrice = parseMoney(formData.total_price);
    const qty = parseFloat(formData.qty) || 0;
    const unitPrice = qty > 0 ? Math.round(totalPrice / qty) : 0; // Round unit price

    setFormData(prev => ({
      ...prev,
      total_price: formatMoney(totalPrice),
      unit_price: formatMoney(unitPrice)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: UpdateOrderRequest = {
      raw_url: formData.url || undefined,
      qty: formData.qty ? parseFloat(formData.qty) : undefined,
      type: formData.type || undefined,
      currency: formData.currency || undefined,
      status_code: formData.status_code || undefined,
      note: formData.note || undefined,
      user: {
        name: formData.user_name || undefined,
        address: formData.user_address || undefined,
        phone_number: formData.user_phone || undefined,
      },
      // Add price fields
      unit_price: parseMoney(formData.unit_price),
      total_price: parseMoney(formData.total_price),
      // Add item selection
      item: {
        item_id: formData.selected_item_id ? parseInt(formData.selected_item_id) : 0,
        item_name: formData.selected_item_id ? postData?.items?.[parseInt(formData.selected_item_id)]?.name : undefined,
        item_type: formData.type || undefined,
        unit_price: parseMoney(formData.unit_price),
        qty: formData.qty ? parseFloat(formData.qty) : 0,
        total_price: parseMoney(formData.total_price),
      },
    };
    onSubmit(submitData);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      if (order) {
        setFormData({
          url: getOrderCustomerUrl(order) || '',
          qty: getOrderQuantity(order)?.toString() || '',
          type: getOrderType(order) || '',
          currency: order.currency || 'VND',
          status_code: order.status_code || '',
          note: order.note || '',
          user_name: getOrderCustomerName(order) || '',
          user_address: getOrderAddress(order) || '',
          user_phone: getOrderPhoneNumber(order) || '',
          unit_price: formatMoney(order?.item?.unit_price || 0),
          total_price: formatMoney(getOrderTotalPrice(order) || 0),
          selected_item_id: order?.item?.item_id?.toString() || '',
        });
      }
    }
    onOpenChange(open);
  };

  if (!selectedPostId || !order) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa đơn hàng</DialogTitle>
          <DialogDescription>
            Chỉnh sửa thông tin đơn hàng cho Post #{selectedPostId}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 py-3">
            {/* User Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="user_name">Tên khách hàng</Label>
                <Input
                  id="user_name"
                  value={formData.user_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, user_name: e.target.value })}
                  placeholder="Tên khách hàng"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user_phone">Số điện thoại</Label>
                <Input
                  id="user_phone"
                  value={formData.user_phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, user_phone: e.target.value })}
                  placeholder="Số điện thoại"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user_address">Địa chỉ</Label>
              <Textarea
                id="user_address"
                value={formData.user_address}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, user_address: e.target.value })}
                placeholder="Địa chỉ khách hàng"
                rows={2}
              />
            </div>
            {/* User URL - Read Only */}
            <div className="grid gap-2">
              <Label htmlFor="url">{t.posts.userUrl}</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                readOnly
                className="bg-gray-100 cursor-not-allowed"
                placeholder="https://facebook.com/profile/..."
              />
              <p className="text-sm text-gray-500">
                URL không thể chỉnh sửa
              </p>
            </div>


            {/* Status and Item Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status_code">{t.common.status}</Label>
                <Select
                  value={formData.status_code || undefined}
                  onValueChange={(value: string) => setFormData({ ...formData, status_code: value })}
                >
                  <SelectTrigger>
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
              <div className="grid gap-2">
                <Label htmlFor="selected_item_id">Chọn sản phẩm</Label>
                {postData?.items && postData.items.length > 0 ? (
                  <Select
                    value={formData.selected_item_id || undefined}
                    onValueChange={(value: string) => setFormData({ ...formData, selected_item_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn sản phẩm từ danh sách" />
                    </SelectTrigger>
                    <SelectContent>
                      {postData.items.map((item: any, index: number) => (
                        <SelectItem key={item._id || index} value={item._id || index.toString()}>
                          {item.name} - {item.type}
                          {item.prices && item.prices.length > 0 && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({item.prices.length} giá)
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="selected_item_id"
                    value="Không có sản phẩm"
                    disabled
                    placeholder="Không có sản phẩm"
                  />
                )}
              </div>
            </div>

            {/* Item Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">{t.common.type}</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, type: e.target.value })}
                placeholder="VD: S, M, L"
              />
            </div>

            {/* Price Information - Unit Price, Quantity, Total Price */}
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unit_price">Giá đơn vị (VND)</Label>
                <Input
                  id="unit_price"
                  type="text"
                  value={formData.unit_price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUnitPriceChange(e.target.value)}
                  onBlur={handleUnitPriceBlur}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qty">{t.common.quantity}</Label>
                <Input
                  id="qty"
                  type="number"
                  step="0.1"
                  value={formData.qty}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, qty: e.target.value })}
                  placeholder="1.0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="total_price">Tổng tiền (VND)</Label>
                <Input
                  id="total_price"
                  type="text"
                  value={formData.total_price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTotalPriceChange(e.target.value)}
                  onBlur={handleTotalPriceBlur}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Ghi chú cho đơn hàng..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t.common.loading : 'Cập nhật'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
