const Fraction = require('../utils/fractionUtils');

console.log("Verifying Fraction.from() factory...");

function assert(condition, message) {
    if (!condition) {
        console.error(`FAILED: ${message}`);
        process.exit(1);
    } else {
        console.log(`PASSED: ${message}`);
    }
}

try {
    // Integer Test
    const f1 = Fraction.from(5);
    assert(f1.toString() === "5/1", "Fraction.from(5) -> 5/1");

    // Float Test (simple)
    const f2 = Fraction.from(0.5);
    assert(f2.toString() === "1/2", "Fraction.from(0.5) -> 1/2");

    // Float Test (repeating)
    const f3 = Fraction.from(0.3333333333); // approx 1/3
    assert(f3.toString() === "1/3", "Fraction.from(0.3333...) -> 1/3");
    
    // Float Test (complex)
    // 2.333... -> 7/3
    const f4 = Fraction.from(2.3333333333);
    assert(f4.toString() === "7/3", "Fraction.from(2.333...) -> 7/3");

    // String Fraction Test
    const f5 = Fraction.from("3/4");
    assert(f5.toString() === "3/4", "Fraction.from('3/4') -> 3/4");
    
    // String Float Test
    const f6 = Fraction.from("0.25");
    assert(f6.toString() === "1/4", "Fraction.from('0.25') -> 1/4");

    // BigInt Test
    const f7 = Fraction.from(10n);
    assert(f7.toString() === "10/1", "Fraction.from(10n) -> 10/1");
    
    // From Fraction Test
    const f8 = new Fraction(2, 3);
    const f9 = Fraction.from(f8);
    assert(f9.toString() === "2/3", "Fraction.from(Fraction) -> identity");
    assert(f9 === f8, "Fraction.from(Fraction) returns same instance");

    // Divison Test (chained)
    // 5 / 2 = 2.5 -> 5/2
    const f10 = Fraction.from(5).divide(Fraction.from(2));
    assert(f10.toString() === "5/2", "Fraction(5).divide(Fraction(2)) -> 5/2");

    console.log("All verifications passed!");

} catch (e) {
    console.error("Verification crashed:", e);
    process.exit(1);
}
