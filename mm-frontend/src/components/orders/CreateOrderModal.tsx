import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/app-store';
import { useStatuses } from '@/hooks/use-api';
import { t } from '@/lib/i18n';

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  loading?: boolean;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}) => {
  const { selectedPostId } = useAppStore();
  const { data: statuses } = useStatuses({ active: true });

  const [formData, setFormData] = useState({
    comment_id: '',
    comment_url: '',
    comment_text: '',
    url: '',
    qty: '',
    type: '',
    currency: 'VND',
    status_code: '',
    note: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      qty: parseFloat(formData.qty),
    };
    onSubmit(submitData);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({
        comment_id: '',
        comment_url: '',
        comment_text: '',
        url: '',
        qty: '',
        type: '',
        currency: 'VND',
        status_code: '',
        note: '',
      });
    }
    onOpenChange(open);
  };

  if (!selectedPostId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t.posts.addOrder}</DialogTitle>
          <DialogDescription>
            Tạo đơn hàng mới cho Post #{selectedPostId}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="comment_id">{t.posts.commentId}</Label>
              <Input
                id="comment_id"
                value={formData.comment_id}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, comment_id: e.target.value })}
                placeholder="ID bình luận"
                required
              />
            </div>
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
              <Label htmlFor="comment_text">{t.posts.commentText}</Label>
              <Textarea
                id="comment_text"
                value={formData.comment_text}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, comment_text: e.target.value })}
                placeholder="Nội dung bình luận..."
                rows={3}
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
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="qty">{t.common.quantity}</Label>
                <Input
                  id="qty"
                  type="number"
                  step="0.1"
                  value={formData.qty}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, qty: e.target.value })}
                  placeholder="1.0"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">{t.common.type}</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="VD: S, M, L"
                  required
                />
              </div>
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
            <div className="grid gap-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Ghi chú cho đơn hàng..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t.common.loading : t.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
