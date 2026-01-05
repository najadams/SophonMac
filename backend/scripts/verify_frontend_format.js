
// Mock the import since we are in node environment
// Only copy the logic for testing or use esm runner
// I'll copy the logic briefly to verify the algos.

function formatQuantity(value) {
    if (value === null || value === undefined) return "0";

    let num, den;

    if (typeof value === 'object') {
        if (value.quantity_numerator !== undefined && value.quantity_denominator) {
            num = Number(value.quantity_numerator);
            den = Number(value.quantity_denominator);
        } else if (value.onhand !== undefined) {
             value = value.onhand;
        } else {
             if (value.quantity !== undefined && !isNaN(value.quantity)) value = value.quantity;
             else return "0";
        }
    }

    if (num !== undefined && den !== undefined) {
        return toMixedFraction(num, den);
    }
    if (typeof value !== 'number') return "0";
    if (value === 0) return "0";
    
    return floatToMixedFraction(value);
}

function toMixedFraction(num, den) {
    if (den === 0) return "0";
    const sign = (num < 0) ^ (den < 0) ? "-" : "";
    num = Math.abs(num);
    den = Math.abs(den);

    const whole = Math.floor(num / den);
    const remainder = num % den;

    if (remainder === 0) return `${sign}${whole}`;
    
    const common = gcd(remainder, den);
    const simpleNum = remainder / common;
    const simpleDen = den / common;
    
    if (whole === 0) return `${sign}${simpleNum}/${simpleDen}`;
    return `${sign}${whole} ${simpleNum}/${simpleDen}`;
}

function floatToMixedFraction(value) {
    if (Math.abs(value - Math.round(value)) < 0.0001) return Math.round(value).toString();
    const sign = value < 0 ? "-" : "";
    value = Math.abs(value);
    const whole = Math.floor(value);
    const fractional = value - whole;
    const { n, d } = approximateFraction(fractional);
    if (whole === 0) return `${sign}${n}/${d}`;
    return `${sign}${whole} ${n}/${d}`;
}

function approximateFraction(x) {
    if (x === 0) return { n: 0, d: 1 };
    const tolerance = 1.0E-4;
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
    let b = x;
    do {
        const a = Math.floor(b);
        let aux = h1; h1 = a * h1 + h2; h2 = aux;
        aux = k1; k1 = a * k1 + k2; k2 = aux;
        b = 1 / (b - a);
    } while (Math.abs(x - h1 / k1) > x * tolerance);
    return { n: h1, d: k1 };
}
function gcd(a, b) {return b ? gcd(b, a % b) : a;}

// Tests
console.log(`0.5 -> ${formatQuantity(0.5)} (Expected: 1/2)`);
console.log(`1.25 -> ${formatQuantity(1.25)} (Expected: 1 1/4)`);
console.log(`2.3333 -> ${formatQuantity(2.3333)} (Expected: 2 1/3)`);
console.log(`-1.5 -> ${formatQuantity(-1.5)} (Expected: -1 1/2)`);
console.log(`0 -> ${formatQuantity(0)} (Expected: 0)`);
console.log(`8.91666666 -> ${formatQuantity(8.91666666)} (Expected: 8 11/12)`);
console.log(`Item(214, 24) -> ${formatQuantity({quantity_numerator: 214, quantity_denominator: 24})} (Expected: 8 11/12)`); // 214/24 = 8.9166.. -> 8 22/24 -> 8 11/12
console.log(`Item(onhand: 1.5) -> ${formatQuantity({onhand: 1.5})} (Expected: 1 1/2)`);

const results = [
    formatQuantity(0.5) === "1/2",
    formatQuantity(1.25) === "1 1/4",
    formatQuantity(2.3333) === "2 1/3",
    formatQuantity(-1.5) === "-1 1/2",
    formatQuantity(0) === "0",
    formatQuantity(8.91666666) === "8 11/12",
    formatQuantity({quantity_numerator: 214, quantity_denominator: 24}) === "8 11/12",
];

if (results.every(r => r)) console.log("SUCCESS: All tests passed.");
else console.error("FAILURE: Some tests failed.");
