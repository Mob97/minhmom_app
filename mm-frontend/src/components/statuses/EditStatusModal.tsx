import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useStatus } from '@/hooks/use-api';
import { t } from '@/lib/i18n';

interface EditStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusCode: string | null;
  onSubmit: (statusCode: string, data: any) => void;
  loading?: boolean;
}

export const EditStatusModal: React.FC<EditStatusModalProps> = ({
  open,
  onOpenChange,
  statusCode,
  onSubmit,
  loading = false,
}) => {
  const { data: status, isLoading } = useStatus(statusCode || '');

  const [formData, setFormData] = useState({
    display_name: '',
    description: '',
    is_active: true,
    view_order: '',
  });

  useEffect(() => {
    if (status) {
      setFormData({
        display_name: status.display_name,
        description: status.description || '',
        is_active: status.is_active,
        view_order: status.view_order ? status.view_order.toString() : '',
      });
    }
  }, [status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (statusCode) {
      const submitData = {
        ...formData,
        view_order: formData.view_order ? parseInt(formData.view_order, 10) : undefined
      };
      onSubmit(statusCode, submitData);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({
        display_name: '',
        description: '',
        is_active: true,
        view_order: '',
      });
    }
    onOpenChange(open);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t.common.loading}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.statuses.editStatus}</DialogTitle>
          <DialogDescription>
            Chỉnh sửa thông tin trạng thái: {statusCode}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status_code">{t.statuses.statusCode}</Label>
              <Input
                id="status_code"
                value={statusCode || ''}
                disabled
                className="bg-muted"
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
              {loading ? t.common.loading : t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
