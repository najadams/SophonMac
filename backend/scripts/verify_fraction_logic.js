
const Fraction = require('../utils/fractionUtils');

console.log("Testing Fractional Logic for 'Don Simon'...");

// Initial State: 8 Packs + 22 Pcs. (1 Pack = 24 Pcs)
// 8 + 22/24 = 214/24 = 107/12.
let onhand = new Fraction(107, 12);
console.log(`Initial Onhand: ${onhand.toString()} (${onhand.toFloat()})`);

// Sell 1 Piece (1/24 Pack)
const conversionRate = 24;
const sellQuantity = 1;
const sellFraction = new Fraction(sellQuantity, conversionRate);

console.log(`Selling 1 Piece (Decucting ${sellFraction.toString()})...`);

onhand = onhand.subtract(sellFraction);
console.log(`New Onhand: ${onhand.toString()} (${onhand.toFloat()})`);

if (onhand.n === 71 && onhand.d === 8) {
    console.log("SUCCESS: 213/24 -> 71/8 is correct.");
} else {
    console.error("FAILURE: Calculation wrong.");
}

// Sell 213 Pieces (Remaining)
console.log("Selling remaining 213 pieces...");
const remainingSell = new Fraction(213, 24);
onhand = onhand.subtract(remainingSell);
console.log(`Final Onhand: ${onhand.toString()} (${onhand.toFloat()})`);

if (onhand.n === 0) {
    console.log("SUCCESS: Reached exactly 0.");
} else {
    console.error("FAILURE: Did not reach 0.");
}
