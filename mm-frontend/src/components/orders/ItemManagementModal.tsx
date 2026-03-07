import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, X, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { imageApi } from '@/lib/api-client';
import { ImageGallery } from '@/components/ui/image-gallery';
import type { PostItem, PricePack, StockHistoryEntry } from '@/types/api';

interface ItemManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PostItem[];
  onSave: (items: PostItem[]) => void;
  loading?: boolean;
  isAdmin?: boolean;
  groupId?: string;
  postId?: string;
}

interface EditableItem extends PostItem {
  // No id field - using qty as identifier
}

interface EditablePricePack extends PricePack {
  // No id field - using qty as identifier
}

function computedStock(item: PostItem): number {
  const history = item.stock_history || [];
  return history.reduce((s, e) => s + (e.quantity ?? 0), 0);
}

export const ItemManagementModal: React.FC<ItemManagementModalProps> = ({
  open,
  onOpenChange,
  items,
  onSave,
  loading = false,
  isAdmin = false,
  groupId = '',
  postId = ''
}) => {
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [stockFormItemIndex, setStockFormItemIndex] = useState<number | null>(null);
  const [stockFormQuantity, setStockFormQuantity] = useState('');
  const [stockFormNote, setStockFormNote] = useState('');
  const [stockFormFiles, setStockFormFiles] = useState<File[]>([]);
  const [stockFormUploading, setStockFormUploading] = useState(false);
  const prevOpenRef = useRef(false);
  const { toast } = useToast();

  // Initialize editable items only when modal opens (not when items ref changes, to avoid wiping in-progress edits)
  useEffect(() => {
    if (open) {
      if (!prevOpenRef.current) {
        setEditableItems([...items]);
      }
      prevOpenRef.current = true;
    } else {
      prevOpenRef.current = false;
    }
  }, [open, items]);

  const handleAddItem = () => {
    const newItem: EditableItem = {
      name: '',
      type: '',
      prices: [{
        qty: 1,
        bundle_price: 0
      }],
      stock_quantity: undefined,
      import_price: undefined
    };
    const newIndex = editableItems.length;
    setEditableItems([...editableItems, newItem]);
    setEditingIndex(newIndex);
    setEditingItem(newItem);
    setIsEditing(true);
  };

  const handleEditItem = (item: EditableItem) => {
    const idx = editableItems.findIndex((i) => i === item);
    setEditingIndex(idx >= 0 ? idx : null);
    setEditingItem(item);
    setIsEditing(true);
  };

  const handleDeleteItem = (itemIndex: number) => {
    setEditableItems(editableItems.filter((_, index) => index !== itemIndex));
    if (editingIndex === itemIndex) {
      setEditingItem(null);
      setEditingIndex(null);
      setIsEditing(false);
    } else if (editingIndex !== null && editingIndex > itemIndex) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const handleSaveItem = () => {
    if (!editingItem || editingIndex === null) return;

    const updatedItems = [...editableItems];
    if (editingIndex >= 0 && editingIndex < updatedItems.length) {
      updatedItems[editingIndex] = editingItem;
      setEditableItems(updatedItems);
    }
    setEditingItem(null);
    setEditingIndex(null);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditingIndex(null);
    setIsEditing(false);
  };

  const handleUpdateItemField = (field: keyof EditableItem, value: string | number | undefined) => {
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
      prices: item.prices,
      stock_quantity: item.stock_quantity,
      import_price: item.import_price
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
                        {item.stock_quantity != null && (
                          <span className="text-sm text-muted-foreground">
                            · Tồn: {item.stock_quantity}
                          </span>
                        )}
                        {isAdmin && item.import_price != null && item.import_price > 0 && (
                          <span className="text-sm text-muted-foreground">
                            · Giá nhập: {formatCurrency(item.import_price)}
                          </span>
                        )}
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
                  <div>
                    <Label htmlFor="item-stock">Số lượng tồn kho</Label>
                    <Input
                      id="item-stock"
                      type="number"
                      min={0}
                      step={1}
                      value={editingItem.stock_quantity ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        handleUpdateItemField('stock_quantity', v === '' ? undefined : Math.max(0, parseInt(v, 10) || 0));
                      }}
                      placeholder="Để trống = không giới hạn"
                    />
                  </div>
                  {isAdmin && (
                    <div>
                      <Label htmlFor="item-import-price">Giá nhập (VND)</Label>
                      <Input
                        id="item-import-price"
                        type="number"
                        min={0}
                        step={1000}
                        value={editingItem.import_price ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          handleUpdateItemField('import_price', v === '' ? undefined : Math.max(0, parseFloat(v) || 0));
                        }}
                        placeholder="Để trống = 0"
                      />
                    </div>
                  )}
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
