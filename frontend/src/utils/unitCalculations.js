export const calculateQuantityInAtomicUnits = (quantity, unit, product) => {
  if (!product || unit === "none") return quantity;

  // If using atomic unit, no conversion needed
  if (unit === product.atomicUnit) return quantity;

  // If using base unit, convert to atomic units
  if (unit === product.baseUnit) {
    return quantity * product.conversionFactor;
  }

  // For other units, find the conversion
  const conversion = product.conversions?.find(
    (conv) => conv.toUnit === unit
  );
  if (conversion) {
    return quantity * conversion.factor;
  }

  return quantity;
};