const dbUtils = require('../utils/dbUtils');
const Fraction = require('../utils/fractionUtils');
const EventService = require('./eventService');

class InventoryService {
  /**
   * Update stock quantity using precise Fraction arithmetic.
   * Centralized logic to prevent precision loss.
   *
   * @param {string} productId - The ID of the inventory item
   * @param {number|Fraction} changeQuantity - Quantity to add (positive) or remove (negative)
   * @param {string} [unit=null] - The unit of the changeQuantity (will trigger conversion if different from base)
   * @returns {Promise<{newOnhand: number, newNumerator: bigint, newDenominator: bigint}>}
   */
  static async updateStock(productId, changeQuantity, unit = null) {
    // 1. Get current product state
    const product = await dbUtils.dbGet(
      `SELECT id, companyId, name, onhand, baseUnit,
              quantity_numerator, quantity_denominator
       FROM Inventory WHERE id = ?`,
      [productId]
    );

    if (!product) {
      throw new Error('Product not found');
    }

    // 2. Determine conversion rate if unit is provided
    let conversionRate = 1;
    if (unit && unit !== product.baseUnit && unit !== 'none') {
      const conversion = await dbUtils.dbGet(
        `SELECT conversionRate FROM UnitConversion
         WHERE inventoryId = ? AND toUnit = ?`,
        [productId, unit]
      );

      if (conversion) {
        conversionRate = conversion.conversionRate;
      }
    }

    // 3. Calculate fraction delta
    let deltaFrac;
    const rawQ = Fraction.from(changeQuantity);
    const rateFrac = Fraction.from(conversionRate);
    deltaFrac = rawQ.divide(rateFrac);

    // 4. Get current stock as fraction
    let currentFrac;
    if (product.quantity_numerator === null || product.quantity_numerator === undefined) {
      currentFrac = Fraction.fromFloat(product.onhand || 0);
    } else {
      currentFrac = new Fraction(product.quantity_numerator, product.quantity_denominator);
    }

    // 5. Apply delta
    const newFrac = currentFrac.add(deltaFrac);

    // 6. Update database
    const now = new Date().toISOString();

    await dbUtils.dbRun(
      `UPDATE Inventory
       SET onhand = ?,
           quantity_numerator = ?,
           quantity_denominator = ?,
           updatedAt = ?
       WHERE id = ?`,
      [
        newFrac.toFloat(),
        newFrac.n.toString(),
        newFrac.d.toString(),
        now,
        productId
      ]
    );

    // Emit change event
    EventService.emit(product.companyId, 'INVENTORY_CHANGE', {
      id: productId,
      name: product.name,
      onhand: newFrac.toFloat(),
      delta: deltaFrac.toFloat(),
      operation: deltaFrac.compare(new Fraction(0)) >= 0 ? 'stock_add' : 'stock_remove'
    });

    return {
      newOnhand: newFrac.toFloat(),
      newNumerator: newFrac.n,
      newDenominator: newFrac.d
    };
  }
}

module.exports = InventoryService;
