# Order Structure Migration Guide

This guide explains the migration from the legacy order structure to the new optimized structure.

## Overview

The order data structure has been optimized to better organize related information and improve maintainability. The new structure groups related fields together and provides better type safety.

## Key Changes

### 1. **Grouped Fields**

#### Previous Structure (Legacy)
```json
{
  "order_id": "string",
  "comment_id": "string",
  "comment_url": "string",
  "comment_text": "string",
  "comment_created_time": "datetime",
  "url": "string",
  "raw_url": "string",
  "qty": "number",
  "type": "string",
  "matched_item": {
    "name": "string",
    "type": "string"
  },
  "price_calc": "object",
  "currency": "string",
  "parsed_at": "datetime",
  "source": "string",
  "user": "object",
  "address": "string",
  "status_code": "string",
  "status_history": "array",
  "note": "string"
}
```

#### New Optimized Structure
```json
{
  "order_id": "string",
  "parsed_at": "datetime",
  "currency": "string",
  "raw_url": "string",
  "source": {
    "comment_id": "string",
    "comment_url": "string",
    "comment_text": "string",
    "comment_created_time": "datetime"
  },
  "customer": {
    "fb_uid": "string",
    "fb_username": "string",
    "name": "string",
    "fb_url": "string",
    "created_date": "datetime",
    "addresses": "array",
    "address": "string",
    "phone_number": "string",
    "avatar_url": "string",
    "note": "string"
  },
  "delivery_info": {
    "name": "string",
    "phone_number": "string",
    "address": "string"
  },
  "item": {
    "item_id": "number",
    "item_name": "string",
    "item_type": "string",
    "unit_price": "number",
    "qty": "number",
    "total_price": "number",
    "price_calculation": "object"
  },
  "status_code": "string",
  "status_history": [
    {
      "status": "string",
      "note": "string",
      "at": "datetime"
    }
  ],
  "note": "string"
}
```

### 2. **Field Mappings**

| Legacy Field | New Location | Notes |
|--------------|--------------|-------|
| `comment_id` | `source.comment_id` | Comment-related info grouped |
| `comment_url` | `source.comment_url` | |
| `comment_text` | `source.comment_text` | |
| `comment_created_time` | `source.comment_created_time` | |
| `url` | `customer.fb_url` | User URL moved to customer |
| `user` | `customer` | Complete user object |
| `address` | `delivery_info.address` | Delivery info separated |
| `qty` | `item.qty` | Item info grouped |
| `type` | `item.item_type` | |
| `matched_item` | `item.item_name` + `item.item_type` | |
| `price_calc` | `item.price_calculation` | |

### 3. **New Fields**

- `item.item_id`: Index matching items array in post (defaults to 0)
- `item.unit_price`: Calculated per-unit price
- `item.total_price`: Total calculated price
- `delivery_info`: Extracted shipping information
- `customer.addresses`: Array of all customer addresses
- `customer.created_date`: Customer creation date

## Backward Compatibility

The migration maintains full backward compatibility by:

1. **Preserving Legacy Fields**: All legacy fields are kept in the database
2. **Dual Format Support**: API endpoints accept both old and new formats
3. **Automatic Conversion**: Legacy orders are automatically converted when accessed
4. **Helper Functions**: Frontend uses helper functions that work with both formats

## Migration Process

### 1. **Backend Changes**

- Updated Pydantic models in `schemas.py`
- Modified API endpoints to work with new optimized structure
- Simplified order creation and retrieval logic
- Removed legacy conversion functions (data already migrated)

### 2. **Frontend Changes**

- Updated TypeScript interfaces in `types/api.ts`
- Created helper functions in `lib/order-utils.ts`
- Updated components to use new structure
- Maintained backward compatibility with legacy fields

### 3. **Database Migration**

✅ **COMPLETED** - All existing data has been migrated to the new optimized structure.

## Usage Examples

### Frontend Helper Functions

```typescript
import {
  getOrderCustomerName,
  getOrderItemName,
  getOrderTotalPrice
} from '@/lib/order-utils';

// Works with both old and new formats
const customerName = getOrderCustomerName(order);
const itemName = getOrderItemName(order);
const totalPrice = getOrderTotalPrice(order);
```

### Backend Conversion

```python
from app.routers.posts import convert_legacy_order_to_new

# Convert legacy order to new format
new_order = convert_legacy_order_to_new(legacy_order)
```

## Benefits

1. **Better Organization**: Related fields are grouped together
2. **Type Safety**: Improved TypeScript support
3. **Maintainability**: Easier to understand and modify
4. **Extensibility**: Easy to add new fields to appropriate groups
5. **Performance**: Better data structure for queries and processing

## Testing

After migration, verify that:

1. All existing orders display correctly
2. New orders can be created with both formats
3. Order updates work properly
4. All API endpoints function correctly
5. Frontend components render properly

## Rollback Plan

If issues arise, the system can be rolled back by:

1. Reverting code changes
2. Legacy fields are preserved, so no data loss
3. Frontend will continue to work with legacy format
4. Database migration can be reversed if needed

## Support

For questions or issues with the migration:

1. Check the migration logs
2. Verify database connectivity
3. Test with a small subset of data first
4. Review the helper functions for proper usage
