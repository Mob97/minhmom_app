import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({ open, onOpenChange }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { changePassword } = useAuth();
  const { toast } = useToast();

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: t.common.error,
        description: t.auth.fillAllFields,
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t.common.error,
        description: t.validation.minLength.replace('{min}', '6'),
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t.common.error,
        description: t.auth.passwordsNotMatch,
        variant: 'destructive',
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast({
        title: t.common.error,
        description: t.auth.newPasswordMustDiffer,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast({
        title: t.common.success,
        description: t.auth.changePasswordSuccess,
      });
      handleOpenChange(false);
    } catch (error: any) {
      toast({
        title: t.auth.changePasswordFailed,
        description: error.detail || t.auth.changePasswordFailed,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.auth.changePassword}</DialogTitle>
          <DialogDescription>{t.auth.changePasswordDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 py-3">
            <div className="grid gap-2">
              <Label htmlFor="current-password">{t.auth.currentPassword}</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                placeholder={t.auth.enterCurrentPassword}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">{t.auth.newPassword}</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                placeholder={t.auth.enterNewPassword}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">{t.auth.confirmPassword}</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                placeholder={t.auth.enterConfirmPassword}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t.common.loading : t.auth.changePassword}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
