import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { t } from '@/lib/i18n';

interface CreateStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  loading?: boolean;
}

export const CreateStatusModal: React.FC<CreateStatusModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    status_code: '',
    display_name: '',
    description: '',
    is_active: true,
    view_order: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      view_order: formData.view_order ? parseInt(formData.view_order, 10) : undefined
    };
    onSubmit(submitData);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({
        status_code: '',
        display_name: '',
        description: '',
        is_active: true,
        view_order: '',
      });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.statuses.createStatus}</DialogTitle>
          <DialogDescription>
            Tạo trạng thái mới để quản lý đơn hàng
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status_code">{t.statuses.statusCode}</Label>
              <Input
                id="status_code"
                value={formData.status_code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, status_code: e.target.value })}
                placeholder="VD: pending, confirmed, shipped"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="display_name">{t.statuses.statusName}</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="VD: Đang chờ xử lý"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="view_order">Thứ tự hiển thị</Label>
              <Input
                id="view_order"
                value={formData.view_order}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, view_order: e.target.value })}
                placeholder="VD: 100, 200, 300"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t.statuses.statusDescription}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả chi tiết về trạng thái này..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">{t.statuses.active}</Label>
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
