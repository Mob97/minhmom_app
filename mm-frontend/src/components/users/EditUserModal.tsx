import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { useUser } from '@/hooks/use-api';
import { t } from '@/lib/i18n';

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string | null;
  onSubmit: (uid: string, data: any) => void;
  loading?: boolean;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  open,
  onOpenChange,
  uid,
  onSubmit,
  loading = false,
}) => {
  const { data: user, isLoading } = useUser(uid || '');

  const [formData, setFormData] = useState({
    name: '',
    fb_username: '',
    fb_url: '',
    addresses: [''],
    phone_number: '',
    avatar_url: '',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        fb_username: user.fb_username || '',
        fb_url: user.fb_url || '',
        addresses: user.addresses && user.addresses.length > 0 ? user.addresses : [''],
        phone_number: user.phone_number || '',
        avatar_url: user.avatar_url || '',
        notes: user.notes || '',
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uid) {
      // Filter out empty addresses before submitting
      const filteredData = {
        ...formData,
        addresses: formData.addresses.filter(addr => addr.trim() !== '')
      };
      onSubmit(uid, filteredData);
    }
  };

  const addAddress = () => {
    setFormData({
      ...formData,
      addresses: [...formData.addresses, '']
    });
  };

  const removeAddress = (index: number) => {
    if (formData.addresses.length > 1) {
      setFormData({
        ...formData,
        addresses: formData.addresses.filter((_, i) => i !== index)
      });
    }
  };

  const updateAddress = (index: number, value: string) => {
    const newAddresses = [...formData.addresses];
    newAddresses[index] = value;
    setFormData({
      ...formData,
      addresses: newAddresses
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({
        name: '',
        fb_username: '',
        fb_url: '',
        addresses: [''],
        phone_number: '',
        avatar_url: '',
        notes: '',
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
          <DialogTitle>{t.users.editUser}</DialogTitle>
          <DialogDescription>
            Chỉnh sửa thông tin người dùng: {uid}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fb_uid">{t.users.fbUid}</Label>
              <Input
                id="fb_uid"
                value={uid || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">{t.users.name}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Nguyễn Văn A"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fb_username">{t.users.fbUsername}</Label>
              <Input
                id="fb_username"
                value={formData.fb_username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, fb_username: e.target.value })}
                placeholder="VD: 100011746878218"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fb_url">{t.users.fbUrl}</Label>
              <Input
                id="fb_url"
                type="url"
                value={formData.fb_url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, fb_url: e.target.value })}
                placeholder="https://www.facebook.com/100011746878218"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t.users.address}</Label>
              <div className="space-y-2">
                {formData.addresses.map((address, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={address}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAddress(index, e.target.value)}
                      placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM"
                    />
                    {formData.addresses.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAddress(index)}
                        className="px-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAddress}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm địa chỉ
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone_number">{t.users.phoneNumber}</Label>
              <Input
                id="phone_number"
                value={formData.phone_number}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="VD: 0123456789"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avatar_url">{t.users.avatarUrl}</Label>
              <Input
                id="avatar_url"
                type="url"
                value={formData.avatar_url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, avatar_url: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">{t.users.notes}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ghi chú về người dùng này..."
                rows={3}
              />
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
