import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PostItem, PricePack } from '@/types/api';

interface ItemManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PostItem[];
  onSave: (items: PostItem[]) => void;
  loading?: boolean;
}

interface EditableItem extends PostItem {
  // No id field - using qty as identifier
}

interface EditablePricePack extends PricePack {
  // No id field - using qty as identifier
}

export const ItemManagementModal: React.FC<ItemManagementModalProps> = ({
  open,
  onOpenChange,
  items,
  onSave,
  loading = false
}) => {
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Initialize editable items when modal opens
  useEffect(() => {
    if (open) {
      setEditableItems([...items]);
    }
  }, [open, items]);

  const handleAddItem = () => {
    const newItem: EditableItem = {
      name: '',
      type: '',
      prices: [{
        qty: 1,
        bundle_price: 0
      }]
    };
    setEditableItems([...editableItems, newItem]);
    setEditingItem(newItem);
    setIsEditing(true);
  };

  const handleEditItem = (item: EditableItem) => {
    setEditingItem(item);
    setIsEditing(true);
  };

  const handleDeleteItem = (itemIndex: number) => {
    setEditableItems(editableItems.filter((_, index) => index !== itemIndex));
    if (editingItem === editableItems[itemIndex]) {
      setEditingItem(null);
      setIsEditing(false);
    }
  };

  const handleSaveItem = () => {
    if (!editingItem) return;

    const editingIndex = editableItems.findIndex(item => item === editingItem);
    if (editingIndex !== -1) {
      const updatedItems = [...editableItems];
      updatedItems[editingIndex] = editingItem;
      setEditableItems(updatedItems);
    }
    setEditingItem(null);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setIsEditing(false);
  };

  const handleUpdateItemField = (field: keyof EditableItem, value: string) => {
    if (!editingItem) return;
    setEditingItem({ ...editingItem, [field]: value });
  };

  const handleAddPrice = () => {
    if (!editingItem) return;
    const newPrice: EditablePricePack = {
      qty: 1,
      bundle_price: 0
    };
    setEditingItem({
      ...editingItem,
      prices: [...editingItem.prices, newPrice]
    });
  };

  const handleUpdatePrice = (priceIndex: number, field: keyof EditablePricePack, value: number) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      prices: editingItem.prices.map((price, index) =>
        index === priceIndex ? { ...price, [field]: value } : price
      )
    });
  };

  const handleDeletePrice = (priceIndex: number) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      prices: editingItem.prices.filter((_, index) => index !== priceIndex)
    });
  };

  const handleSave = () => {
    // Validate items
    const hasEmptyItems = editableItems.some(item => !item.name?.trim() || !item.type?.trim());
    if (hasEmptyItems) {
      toast({
        title: 'Validation Error',
        description: 'All items must have a name and type',
        variant: 'destructive',
      });
      return;
    }

    const hasEmptyPrices = editableItems.some(item =>
      item.prices.length === 0 || item.prices.some(price => price.qty <= 0 || price.bundle_price <= 0)
    );
    if (hasEmptyPrices) {
      toast({
        title: 'Validation Error',
        description: 'All items must have at least one valid price pack',
        variant: 'destructive',
      });
      return;
    }

    // Convert back to PostItem format
    const itemsToSave: PostItem[] = editableItems.map(item => ({
      name: item.name,
      type: item.type,
      prices: item.prices
    }));

    onSave(itemsToSave);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Quản lý sản phẩm</DialogTitle>
          <DialogDescription>
            Thêm, chỉnh sửa hoặc xóa các sản phẩm trong bài đăng này
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Items List */}
          <div className="space-y-3">
            {editableItems.map((item, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.name || 'Unnamed Item'}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline">{item.type || 'No type'}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {item.prices.length} price pack{item.prices.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditItem(item)}
                        disabled={isEditing}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(index)}
                        disabled={isEditing}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {item.prices.map((price, priceIndex) => (
                      <div key={priceIndex} className="flex items-center space-x-2 text-sm">
                        <span className="w-16">{price.qty} pcs</span>
                        <span className="flex-1">→</span>
                        <span className="font-medium">{formatCurrency(price.bundle_price)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {editableItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Chưa có sản phẩm nào</p>
                <p className="text-sm">Nhấn "Thêm sản phẩm" để bắt đầu</p>
              </div>
            )}
          </div>

          {/* Add Item Button */}
          {!isEditing && (
            <Button onClick={handleAddItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Thêm sản phẩm
            </Button>
          )}

          {/* Edit Item Form */}
          {isEditing && editingItem && (
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Chỉnh sửa sản phẩm</CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="item-name">Tên sản phẩm</Label>
                    <Input
                      id="item-name"
                      value={editingItem.name || ''}
                      onChange={(e) => handleUpdateItemField('name', e.target.value)}
                      placeholder="Nhập tên sản phẩm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="item-type">Loại sản phẩm</Label>
                    <Input
                      id="item-type"
                      value={editingItem.type || ''}
                      onChange={(e) => handleUpdateItemField('type', e.target.value)}
                      placeholder="Nhập loại sản phẩm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Bảng giá</Label>
                    <Button variant="outline" size="sm" onClick={handleAddPrice}>
                      <Plus className="h-4 w-4 mr-1" />
                      Thêm giá
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {editingItem.prices.map((price, priceIndex) => (
                      <div key={priceIndex} className="flex items-center space-x-2">
                        <div className="flex-1">
                          <Label htmlFor={`qty-${priceIndex}`} className="text-xs">Số lượng</Label>
                          <Input
                            id={`qty-${priceIndex}`}
                            type="number"
                            min="1"
                            step="1"
                            value={price.qty}
                            onChange={(e) => handleUpdatePrice(priceIndex, 'qty', parseInt(e.target.value) || 1)}
                            className="h-8"
                          />
                        </div>
                        <div className="flex-1">
                          <Label htmlFor={`price-${priceIndex}`} className="text-xs">Giá (VND)</Label>
                          <Input
                            id={`price-${priceIndex}`}
                            type="number"
                            min="0"
                            step="1000"
                            value={price.bundle_price}
                            onChange={(e) => handleUpdatePrice(priceIndex, 'bundle_price', parseFloat(e.target.value) || 0)}
                            className="h-8"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePrice(priceIndex)}
                            disabled={editingItem.prices.length === 1}
                            className="text-destructive hover:text-destructive h-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Hủy
                  </Button>
                  <Button onClick={handleSaveItem}>
                    Lưu sản phẩm
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
