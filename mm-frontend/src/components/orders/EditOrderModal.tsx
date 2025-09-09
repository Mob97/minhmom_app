import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/app-store';
import { useStatuses } from '@/hooks/use-api';
import { t } from '@/lib/i18n';
import type { Order, UpdateOrderRequest } from '@/types/api';

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
  const { selectedPostId } = useAppStore();
  const { data: statuses } = useStatuses({ active: true });

  const [formData, setFormData] = useState({
    comment_url: '',
    comment_text: '',
    url: '',
    qty: '',
    type: '',
    currency: 'VND',
    status_code: '',
    note: '',
    user_name: '',
    user_address: '',
    user_phone: '',
  });

  // Update form data when order changes
  useEffect(() => {
    if (order) {
      setFormData({
        comment_url: order.comment_url || '',
        comment_text: order.comment_text || '',
        url: order.url || '',
        qty: order.qty?.toString() || '',
        type: order.type || '',
        currency: order.currency || 'VND',
        status_code: order.status_code || '',
        note: order.note || '',
        user_name: order.user?.name || order.user?.fb_username || '',
        user_address: order.user?.address || '',
        user_phone: order.user?.phone_number || '',
      });
    }
  }, [order]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: UpdateOrderRequest = {
      comment_url: formData.comment_url || undefined,
      comment_text: formData.comment_text || undefined,
      url: formData.url || undefined,
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
    };
    onSubmit(submitData);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      if (order) {
        setFormData({
          comment_url: order.comment_url || '',
          comment_text: order.comment_text || '',
          url: order.url || '',
          qty: order.qty?.toString() || '',
          type: order.type || '',
          currency: order.currency || 'VND',
          status_code: order.status_code || '',
          note: order.note || '',
          user_name: order.user?.name || order.user?.fb_username || '',
          user_address: order.user?.address || '',
          user_phone: order.user?.phone_number || '',
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="comment_url">URL bình luận</Label>
                <Input
                  id="comment_url"
                  type="url"
                  value={formData.comment_url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, comment_url: e.target.value })}
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="url">{t.posts.userUrl}</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://facebook.com/profile/..."
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="comment_text">{t.posts.commentText}</Label>
              <Textarea
                id="comment_text"
                value={formData.comment_text}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, comment_text: e.target.value })}
                placeholder="Nội dung bình luận..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
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
                <Label htmlFor="type">{t.common.type}</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="VD: S, M, L"
                />
              </div>
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
