import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { t } from '@/lib/i18n';

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  loading?: boolean;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    fb_uid: '',
    name: '',
    fb_username: '',
    fb_url: '',
    addresses: [''],
    phone_number: '',
    avatar_url: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty addresses before submitting
    const filteredData = {
      ...formData,
      addresses: formData.addresses.filter(addr => addr.trim() !== '')
    };
    onSubmit(filteredData);
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
        fb_uid: '',
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.users.createUser}</DialogTitle>
          <DialogDescription>
            Tạo người dùng mới trong hệ thống
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t.users.name} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Nguyễn Văn A"
                  required
                />
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
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fb_uid">{t.users.fbUid} (Tùy chọn)</Label>
              <Input
                id="fb_uid"
                value={formData.fb_uid}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, fb_uid: e.target.value })}
                placeholder="VD: 100011746878218"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fb_username">{t.users.fbUsername} (Tùy chọn)</Label>
              <Input
                id="fb_username"
                value={formData.fb_username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, fb_username: e.target.value })}
                placeholder="VD: 100011746878218"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fb_url">{t.users.fbUrl} (Tùy chọn)</Label>
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
            <div className="grid grid-cols-2 gap-4">
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
                  rows={2}
                />
              </div>
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
