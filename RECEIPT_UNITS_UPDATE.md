# Receipt Units Update

This update adds proper unit tracking to receipt details, ensuring that when sales are edited, items maintain their original sales units instead of being converted to base units.

## Changes Made

### Database Schema Updates

1. **ReceiptDetail Table Enhanced**:
   - Added `salesUnit` - stores the unit used during the sale
   - Added `originalQuantity` - stores the quantity in the sales unit
   - Added `baseUnitQuantity` - stores the quantity converted to base unit
   - Added `conversionRate` - stores the conversion rate used
   - Added `atomicQuantity` - stores the atomic unit quantity
   - Added `totalPrice` - stores the total price for the line item

### Backend Updates

1. **receiptRoutes.js**:
   - Updated `newReceipts` function to store original sales units
   - Updated `updateReceipt` function to preserve unit information during edits
   - Enhanced receipt retrieval to return original sales units
   - Modified receipt detail insertion queries to include new unit fields

2. **Migration System**:
   - Created automatic migration system in `utils/migrationUtils.js`
   - Added migration script `migrations/add_receipt_detail_units.sql`
   - Integrated migration execution into application startup

### Key Features

1. **Unit Preservation**: When a sale is made, the original sales unit and quantity are preserved
2. **Edit Functionality**: When editing receipts, items appear in their original sales units
3. **Backward Compatibility**: Existing receipts are migrated with default values
4. **Automatic Migration**: Database schema updates automatically on application start

## How It Works

### During Sales Creation
1. When a product is sold in a specific unit (e.g., 5 boxes), the system stores:
   - `salesUnit`: "box"
   - `originalQuantity`: 5
   - `baseUnitQuantity`: 50 (if 1 box = 10 pieces)
   - `conversionRate`: 10
   - `atomicQuantity`: calculated atomic units
   - `totalPrice`: total price for the line item

### During Sales Editing
1. When retrieving receipt details for editing:
   - Frontend receives `originalQuantity` and `salesUnit`
   - Items display in their original sales units
   - Unit dropdowns show the correct selected unit

### Database Migration
1. On application startup, the system checks if new columns exist
2. If not, it automatically runs the migration script
3. Existing data is preserved with sensible defaults

## Frontend Integration

The frontend should be updated to:

1. **Display Original Units**: Use `originalQuantity` and `salesUnit` for display
2. **Edit Forms**: Pre-select the correct `salesUnit` in unit dropdowns
3. **Calculations**: Use the enhanced unit information for accurate calculations

## Example Usage

### Before Update
```javascript
// Receipt detail only stored base unit information
{
  name: "Product A",
  quantity: 50, // Always in base unit
  salesPrice: 2.0
}
```

### After Update
```javascript
// Receipt detail now stores complete unit information
{
  name: "Product A",
  quantity: 5, // Original quantity in sales unit
  salesPrice: 2.0,
  salesUnit: "box",
  originalQuantity: 5,
  baseUnitQuantity: 50,
  conversionRate: 10,
  atomicQuantity: 500,
  totalPrice: 100.0
}
```

## Benefits

1. **Accurate Editing**: Users can edit sales in the same units they were originally entered
2. **Better UX**: No confusion about unit conversions during edits
3. **Data Integrity**: Complete audit trail of how items were sold
4. **Flexible Pricing**: Support for different pricing strategies per unit
5. **Backward Compatibility**: Existing data continues to work

## Migration Notes

- The migration runs automatically on application startup
- Existing receipt details get default values for new fields
- No data loss occurs during migration
- The process is idempotent (safe to run multiple times)

## Testing

1. Create a new sale with mixed units
2. Edit the sale and verify units are preserved
3. Check that calculations remain accurate
4. Verify backward compatibility with old receipts