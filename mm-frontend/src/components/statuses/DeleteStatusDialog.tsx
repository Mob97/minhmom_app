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

interface DeleteStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusCode: string | null;
  onConfirm: (statusCode: string) => void;
  loading?: boolean;
}

export const DeleteStatusDialog: React.FC<DeleteStatusDialogProps> = ({
  open,
  onOpenChange,
  statusCode,
  onConfirm,
  loading = false,
}) => {
  const handleConfirm = () => {
    if (statusCode) {
      onConfirm(statusCode);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.statuses.deleteStatus}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.statuses.confirmDelete}
            <br />
            <br />
            <strong>Mã trạng thái:</strong> {statusCode}
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
            {loading ? t.common.loading : t.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
