import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useStatuses } from '@/hooks/use-api';
import type { Order, Status } from '@/types/api';
import { getOrderQuantity } from '@/types/api';

interface SplitOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSplit: (splitQuantity: number, newStatus: string) => Promise<void>;
  loading?: boolean;
}

export const SplitOrderModal: React.FC<SplitOrderModalProps> = ({
  open,
  onOpenChange,
  order,
  onSplit,
  loading = false
}) => {
  const [splitQuantity, setSplitQuantity] = useState(1);
  const [newStatus, setNewStatus] = useState('NEW');
  const { toast } = useToast();
  const { data: statuses } = useStatuses({ active: true });

  const maxQuantity = order ? (typeof getOrderQuantity(order) === 'number' ? getOrderQuantity(order) : 1) : 1;

  useEffect(() => {
    if (order) {
      setSplitQuantity(1);
      setNewStatus('NEW');
    }
  }, [order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!order) return;

    if (splitQuantity <= 0) {
      toast({
        title: 'Lỗi',
        description: 'Số lượng chia phải lớn hơn 0',
        variant: 'destructive',
      });
      return;
    }

    if (splitQuantity >= maxQuantity) {
      toast({
        title: 'Lỗi',
        description: 'Số lượng chia phải nhỏ hơn số lượng gốc',
        variant: 'destructive',
      });
      return;
    }

    try {
      await onSplit(splitQuantity, newStatus);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleCancel = () => {
    setSplitQuantity(1);
    setNewStatus('NEW');
    onOpenChange(false);
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chia đơn hàng</DialogTitle>
          <DialogDescription>
            Chia đơn hàng này bằng cách chuyển một số lượng sang đơn hàng mới với trạng thái khác.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="original-quantity">Số lượng gốc</Label>
            <Input
              id="original-quantity"
              value={maxQuantity}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              Số lượng hiện tại trong đơn hàng gốc
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="split-quantity">Số lượng chia</Label>
            <Input
              id="split-quantity"
              type="number"
              min="1"
              max={maxQuantity - 1}
              value={splitQuantity}
              onChange={(e) => setSplitQuantity(parseInt(e.target.value) || 1)}
              placeholder="Nhập số lượng cần chia"
            />
            <p className="text-sm text-muted-foreground">
              Số lượng chuyển sang đơn hàng mới (1 đến {maxQuantity - 1})
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-status">Trạng thái đơn hàng mới</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {statuses?.map((status: Status) => (
                  <SelectItem key={status.status_code} value={status.status_code}>
                    {String(status.display_name || status.status_code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Trạng thái cho đơn hàng mới được chia
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tóm tắt</Label>
            <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Đơn hàng gốc sẽ có:</span>
                <span className="font-medium">{maxQuantity - splitQuantity} sản phẩm</span>
              </div>
              <div className="flex justify-between">
                <span>Đơn hàng mới sẽ có:</span>
                <span className="font-medium">{splitQuantity} sản phẩm</span>
              </div>
              <div className="flex justify-between">
                <span>Trạng thái đơn hàng mới:</span>
                <span className="font-medium">
                  {String(statuses?.find(s => s.status_code === newStatus)?.display_name || newStatus)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading || splitQuantity <= 0 || splitQuantity >= maxQuantity}
            >
              {loading ? 'Đang chia...' : 'Chia đơn hàng'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
