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
      stock_history: [],
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

    // Convert back to PostItem format (omit stock_quantity; backend computes from stock_history)
    const itemsToSave: PostItem[] = editableItems.map(item => ({
      name: item.name,
      type: item.type,
      prices: item.prices,
      stock_history: item.stock_history || [],
      import_price: item.import_price
    }));

    onSave(itemsToSave);
  };

  const handleOpenStockForm = (itemIndex: number) => {
    setStockFormItemIndex(itemIndex);
    setStockFormQuantity('');
    setStockFormNote('');
    setStockFormFiles([]);
  };

  const handleCancelStockForm = () => {
    setStockFormItemIndex(null);
    setStockFormQuantity('');
    setStockFormNote('');
    setStockFormFiles([]);
  };

  const handleStockFormFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) setStockFormFiles(Array.from(files));
    e.target.value = '';
  };

  const handleSubmitStockBatch = async () => {
    const qty = Math.max(0, parseInt(stockFormQuantity, 10) || 0);
    if (qty <= 0) {
      toast({ title: 'Lỗi', description: 'Nhập số lượng > 0', variant: 'destructive' });
      return;
    }
    if (stockFormItemIndex === null || stockFormItemIndex < 0 || stockFormItemIndex >= editableItems.length) return;

    let imageUrls: string[] = [];
    if (groupId && postId && stockFormFiles.length > 0) {
      setStockFormUploading(true);
      try {
        const res = await imageApi.uploadItemStockImages(groupId, postId, stockFormItemIndex, stockFormFiles);
        imageUrls = res.urls || [];
      } catch (err: unknown) {
        const detail = typeof (err as { detail?: unknown }).detail === 'string' ? (err as { detail: string }).detail : 'Không thể tải ảnh lên';
        toast({ title: 'Lỗi', description: detail, variant: 'destructive' });
        setStockFormUploading(false);
        return;
      }
      setStockFormUploading(false);
    }

    const newEntry: StockHistoryEntry = {
      quantity: qty,
      note: stockFormNote.trim() || undefined,
      images: imageUrls.length > 0 ? imageUrls : undefined
    };

    const updated = [...editableItems];
    const item = updated[stockFormItemIndex];
    const history = [...(item.stock_history || []), newEntry];
    updated[stockFormItemIndex] = { ...item, stock_history: history };

    setEditableItems(updated);
    handleCancelStockForm();
    onSave(updated.map(i => ({
      name: i.name,
      type: i.type,
      prices: i.prices,
      stock_history: i.stock_history || [],
      import_price: i.import_price
    })));
    toast({ title: 'Đã thêm đợt nhập hàng' });
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
                        {(computedStock(item) > 0 || (item.stock_history?.length ?? 0) > 0) && (
                          <span className="text-sm text-muted-foreground">
                            · Tồn: {computedStock(item)}
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
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {item.prices.map((price, priceIndex) => (
                      <div key={priceIndex} className="flex items-center space-x-2 text-sm">
                        <span className="w-16">{price.qty} pcs</span>
                        <span className="flex-1">→</span>
                        <span className="font-medium">{formatCurrency(price.bundle_price)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Nhập hàng button + form */}
                  {!isEditing && (
                    <div className="pt-2 border-t">
                      {stockFormItemIndex !== index ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenStockForm(index)}
                          disabled={!groupId || !postId}
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Nhập hàng
                        </Button>
                      ) : (
                        <div className="space-y-3 p-3 rounded-md bg-muted/50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Thêm đợt nhập hàng</span>
                            <Button variant="ghost" size="sm" onClick={handleCancelStockForm}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Số lượng</Label>
                              <Input
                                type="number"
                                min={1}
                                value={stockFormQuantity}
                                onChange={(e) => setStockFormQuantity(e.target.value)}
                                placeholder="Số lượng"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Ảnh (tùy chọn)</Label>
                              <Input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleStockFormFileChange}
                                className="text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Ghi chú</Label>
                            <Textarea
                              value={stockFormNote}
                              onChange={(e) => setStockFormNote(e.target.value)}
                              placeholder="Ghi chú đợt nhập"
                              rows={2}
                              className="mt-1"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={handleCancelStockForm}>
                              Hủy
                            </Button>
                            <Button size="sm" onClick={handleSubmitStockBatch} disabled={stockFormUploading}>
                              {stockFormUploading ? 'Đang tải ảnh...' : 'Thêm đợt'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lịch sử nhập hàng */}
                  {((item.stock_history?.length) ?? 0) > 0 && (
                    <div className="pt-2 border-t">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Lịch sử nhập hàng</h4>
                      <ul className="space-y-2 max-h-48 overflow-y-auto">
                        {[...(item.stock_history || [])].reverse().map((entry, ei) => (
                          <li key={ei} className="text-sm flex flex-col gap-1 pl-2 border-l-2 border-muted">
                            <span className="text-muted-foreground text-xs">
                              {entry.created_at ? new Date(entry.created_at).toLocaleString('vi-VN') : '—'}
                            </span>
                            <span><strong>{entry.quantity}</strong> {entry.note && `· ${entry.note}`}</span>
                            {entry.images && entry.images.length > 0 && (
                              <ImageGallery
                                images={entry.images}
                                title="Ảnh đợt nhập"
                                postId={`item-${index}-entry-${ei}`}
                                maxDisplay={3}
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
