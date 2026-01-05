
const Fraction = require('../utils/fractionUtils');

console.log("Testing Strict Fraction Logic...");

try {
    // 1. Integer Test (Safe Integer)
    const f1 = new Fraction(1, 3);
    console.log(`1/3: ${f1.toString()}`);
    
    // 2. BigInt Test
    const f2 = new Fraction(1n, 3n);
    console.log(`1n/3n: ${f2.toString()}`);
    
    if (f1.equals(f2)) console.log("SUCCESS: Int and BigInt equivalent.");

    // 3. Comparison
    const f3 = new Fraction(2, 6); // 1/3
    if (f1.compare(f3) === 0) console.log("SUCCESS: 1/3 == 2/6");
    if (f1.compare(new Fraction(1, 2)) === -1) console.log("SUCCESS: 1/3 < 1/2");

    // 4. Float Test (Should Throw)
    try {
        new Fraction(1.5, 1);
        console.error("FAILURE: Float did not throw.");
    } catch (e) {
        console.log("SUCCESS: Float threw error as expected:", e.message);
    }

    // 5. Arithmetic
    const sum = f1.add(new Fraction(2, 3)); // 1/3 + 2/3 = 1
    console.log(`1/3 + 2/3 = ${sum.toString()}`);
    if (sum.toFloat() === 1) console.log("SUCCESS: Sum is 1");

} catch (e) {
    console.error("UNEXPECTED ERROR:", e);
}
