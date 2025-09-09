import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/app-store';
import { useStatuses, useCustomers, useUpdateCustomer, useCreateUser } from '@/hooks/use-api';
import { t } from '@/lib/i18n';
import type { CreateOrderRequest, OrderUser } from '@/types/api';
import { CreateUserModal } from '@/components/users/CreateUserModal';

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

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isCustomerSelected, setIsCustomerSelected] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<OrderUser | null>(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: customers, isLoading: isCustomersLoading } = useCustomers(customerSearch, 10);
  const updateCustomerMutation = useUpdateCustomer();
  const createUserMutation = useCreateUser();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCustomerSelect = (customer: OrderUser) => {
    setCustomerSearch(customer.name || '');
    setIsCustomerSelected(true);
    setSelectedCustomer(customer);
    setSelectedAddress(customer.address || '');
    setFormData(prev => ({
      ...prev,
      user_name: customer.name || '',
      user_address: customer.address || '',
      user_phone: customer.phone_number || '',
      url: customer.fb_url || '', // Fill URL with customer's Facebook URL
    }));
    setShowCustomerDropdown(false);
  };

  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearch(value);
    setShowCustomerDropdown(true);
    if (!value) {
      setIsCustomerSelected(false);
      setSelectedCustomer(null);
      setSelectedAddress('');
      setIsUpdatingCustomer(false);
      setFormData(prev => ({
        ...prev,
        user_name: '',
        user_address: '',
        user_phone: '',
        url: '', // Clear URL when customer is deselected
      }));
    }
  };

  const handleAddressSelect = (address: string) => {
    setSelectedAddress(address);
    setFormData(prev => ({
      ...prev,
      user_address: address,
    }));
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer?.fb_uid || !isUpdatingCustomer) return;

    const updateData: { name?: string; phone_number?: string; address?: string; addresses?: string[] } = {};

    // Check if phone number changed
    if (formData.user_phone !== selectedCustomer.phone_number) {
      updateData.phone_number = formData.user_phone;
    }

    // Check if address changed
    if (formData.user_address !== selectedCustomer.address) {
      updateData.address = formData.user_address;
      // Add to addresses array if not already present
      const currentAddresses = selectedCustomer.addresses || [];
      if (!currentAddresses.includes(formData.user_address)) {
        updateData.addresses = [...currentAddresses, formData.user_address];
      }
    }

    if (Object.keys(updateData).length === 0) {
      setIsUpdatingCustomer(false);
      return;
    }

    try {
      await updateCustomerMutation.mutateAsync({
        uid: selectedCustomer.fb_uid,
        data: updateData
      });

      // Update local state
      setSelectedCustomer(prev => prev ? {
        ...prev,
        phone_number: formData.user_phone,
        address: formData.user_address,
        addresses: updateData.addresses || prev.addresses
      } : null);

      setIsUpdatingCustomer(false);
    } catch (error) {
      console.error('Failed to update customer:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that a customer is selected
    if (!isCustomerSelected || !selectedCustomer) {
      alert('Vui lòng chọn khách hàng từ danh sách hoặc tạo khách hàng mới');
      return;
    }

    const submitData: CreateOrderRequest = {
      url: formData.url || '',
      qty: formData.qty ? parseFloat(formData.qty) : 0,
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

  const handleCreateUser = async (userData: any) => {
    try {
      const newUser = await createUserMutation.mutateAsync(userData);
      // Auto-select the newly created user
      handleCustomerSelect(newUser);
      setShowCreateUserModal(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({
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
      setCustomerSearch('');
      setShowCustomerDropdown(false);
      setIsCustomerSelected(false);
      setSelectedCustomer(null);
      setSelectedAddress('');
      setIsUpdatingCustomer(false);
      setShowCreateUserModal(false);
    }
    onOpenChange(open);
  };

  if (!selectedPostId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.posts.addOrder}</DialogTitle>
          <DialogDescription>
            Tạo đơn hàng mới cho Post #{selectedPostId}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 py-3">
            {/* User Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="customer_search">Tên khách hàng *</Label>
                <div className="relative" ref={dropdownRef}>
                  <Input
                    id="customer_search"
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearchChange(e.target.value)}
                    placeholder="Tìm kiếm khách hàng..."
                    onFocus={() => setShowCustomerDropdown(true)}
                    required
                    className={!isCustomerSelected ? "border-red-300 focus:border-red-500" : ""}
                  />
                  {showCustomerDropdown && customerSearch.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {isCustomersLoading ? (
                        <div className="p-2 text-sm text-gray-500">Đang tìm kiếm...</div>
                      ) : customers && customers.length > 0 ? (
                        customers.map((customer) => (
                          <div
                            key={customer.fb_uid || customer.name}
                            className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                            onClick={() => handleCustomerSelect(customer)}
                          >
                            <div className="font-medium">{customer.name}</div>
                            {customer.phone_number && (
                              <div className="text-sm text-gray-500">{customer.phone_number}</div>
                            )}
                            {customer.address && (
                              <div className="text-sm text-gray-500">{customer.address}</div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-gray-500">Không tìm thấy khách hàng</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateUserModal(true)}
                  className="w-full"
                >
                  Tạo khách hàng mới
                </Button>
              </div>

              {/* Address Selection */}
              {isCustomerSelected && selectedCustomer && selectedCustomer.addresses && selectedCustomer.addresses.length > 1 && (
                <div className="grid gap-2">
                  <Label htmlFor="address_select">Chọn địa chỉ</Label>
                  <Select value={selectedAddress} onValueChange={handleAddressSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn địa chỉ giao hàng" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCustomer.addresses.map((address: string, index: number) => (
                        <SelectItem key={index} value={address}>
                          {address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="user_address">Địa chỉ</Label>
                <Textarea
                  id="user_address"
                  value={formData.user_address}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, user_address: e.target.value })}
                  placeholder="Địa chỉ khách hàng"
                  rows={2}
                  className={isCustomerSelected ? (isUpdatingCustomer ? "bg-yellow-50 border-yellow-300" : "bg-blue-50") : ""}
                />
                {isCustomerSelected && !isUpdatingCustomer && (
                  <p className="text-sm text-blue-600">
                    ✓ Địa chỉ được tự động điền từ thông tin khách hàng
                  </p>
                )}
                {isUpdatingCustomer && (
                  <p className="text-sm text-yellow-600">
                    ✏️ Đang chỉnh sửa thông tin khách hàng
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user_phone">Số điện thoại</Label>
                <Input
                  id="user_phone"
                  value={formData.user_phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, user_phone: e.target.value })}
                  placeholder="Số điện thoại"
                  className={isCustomerSelected ? (isUpdatingCustomer ? "bg-yellow-50 border-yellow-300" : "bg-blue-50") : ""}
                />
                {isCustomerSelected && !isUpdatingCustomer && (
                  <p className="text-sm text-blue-600">
                    ✓ Số điện thoại được tự động điền từ thông tin khách hàng
                  </p>
                )}
                {isUpdatingCustomer && (
                  <p className="text-sm text-yellow-600">
                    ✏️ Đang chỉnh sửa thông tin khách hàng
                  </p>
                )}
              </div>
            </div>

            {/* Update Customer Button */}
            {isCustomerSelected && selectedCustomer && (
              <div className="flex justify-end gap-2">
                {!isUpdatingCustomer ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsUpdatingCustomer(true)}
                  >
                    Chỉnh sửa thông tin khách hàng
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsUpdatingCustomer(false);
                        // Reset form to original customer data
                        setFormData(prev => ({
                          ...prev,
                          user_address: selectedCustomer.address || '',
                          user_phone: selectedCustomer.phone_number || '',
                        }));
                      }}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleUpdateCustomer}
                      disabled={updateCustomerMutation.isPending}
                    >
                      {updateCustomerMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                  </>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="url">{t.posts.userUrl}</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://facebook.com/profile/..."
                  readOnly={isCustomerSelected}
                  className={isCustomerSelected ? "bg-gray-100 cursor-not-allowed" : ""}
                />
                {isCustomerSelected && (
                  <p className="text-sm text-gray-500">
                    URL được tự động điền từ thông tin khách hàng đã chọn
                  </p>
                )}
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

            {/* Validation Message */}
            {!isCustomerSelected && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
                  ⚠️ Vui lòng chọn khách hàng từ danh sách hoặc tạo khách hàng mới
                </p>
              </div>
            )}
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
              {loading ? t.common.loading : t.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Create User Modal */}
      <CreateUserModal
        open={showCreateUserModal}
        onOpenChange={setShowCreateUserModal}
        onSubmit={handleCreateUser}
        loading={createUserMutation.isPending}
      />
    </Dialog>
  );
};
