import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { t } from '@/lib/i18n';
import type { Order } from '@/types/api';
import { getOrderCustomerName, getOrderQuantity, getOrderCommentId } from '@/types/api';

interface DeleteOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onConfirm: (orderId: string) => void;
  loading?: boolean;
}

export const DeleteOrderDialog: React.FC<DeleteOrderDialogProps> = ({
  open,
  onOpenChange,
  order,
  onConfirm,
  loading = false,
}) => {
  const handleConfirm = () => {
    if (order && (order.order_id || getOrderCommentId(order))) {
      onConfirm(order.order_id || getOrderCommentId(order) || '');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa đơn hàng</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa đơn hàng này không? Hành động này không thể hoàn tác.
            <br />
            <br />
            <strong>Mã đơn hàng:</strong> {order?.order_id || (order ? getOrderCommentId(order) : '')}
            <br />
            <strong>Khách hàng:</strong> {order ? getOrderCustomerName(order) : 'Unknown User'}
            <br />
            <strong>Số lượng:</strong> {order ? getOrderQuantity(order) : 0}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {t.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? t.common.loading : 'Xóa'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
