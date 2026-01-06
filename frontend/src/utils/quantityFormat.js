
/**
 * Formats a quantity value into a simplified mixed fraction string.
 * Examples:
 * 0.5 -> "1/2"
 * 1.25 -> "1 1/4"
 * 2.3333 -> "2 1/3"
 * 0 -> "0"
 * 
 * @param {number|object} value - The number to format, OR an inventory item object containing quantity_numerator/denominator
 * @returns {string} The formatted mixed fraction string
 */
export const formatQuantity = (value) => {
    if (value === null || value === undefined) return "0";

    let num, den;

    // Check if input is an item object with fraction fields
    if (typeof value === 'object') {
        if (value.quantity_numerator !== undefined && value.quantity_denominator) {
            num = Number(value.quantity_numerator);
            den = Number(value.quantity_denominator);
            // Fallthrough to simplified fraction string logic
        } else if (value.onhand !== undefined) {
             value = value.onhand; // Use onhand number
        } else {
             // Unknown object, maybe it has 'quantity'?
             if (value.quantity !== undefined && !isNaN(value.quantity)) value = value.quantity;
             else return "0";
        }
    }

    // If we have numerator/denominator from object
    if (num !== undefined && den !== undefined) {
        return toMixedFraction(num, den);
    }

    // Otherwise handle raw number (float/int)
    if (typeof value !== 'number') return "0";
    if (value === 0) return "0";
    
    // Float to Fraction logic
    return floatToMixedFraction(value);
};

// Helper: Convert numerator/denominator to "W N/D"
function toMixedFraction(num, den) {
    if (den === 0) return "0";
    
    // Handle signs
    const sign = (num < 0) ^ (den < 0) ? "-" : "";
    num = Math.abs(num);
    den = Math.abs(den);

    const whole = Math.floor(num / den);
    const remainder = num % den;

    if (remainder === 0) {
        return `${sign}${whole}`;
    }

    // Simplify fraction
    const common = gcd(remainder, den);
    const simpleNum = remainder / common;
    const simpleDen = den / common;
    
    if (whole === 0) {
        return `${sign}${simpleNum}/${simpleDen}`;
    }
    
    return `${sign}${whole} ${simpleNum}/${simpleDen}`;
}

// Float to Fraction Approximation
function floatToMixedFraction(value) {
    // Handle approximate integers
    if (Math.abs(value - Math.round(value)) < 0.0001) {
        return Math.round(value).toString();
    }

    const sign = value < 0 ? "-" : "";
    value = Math.abs(value);
    
    const whole = Math.floor(value);
    const fractional = value - whole;
    
    // Common fractions check (optional optimization)
    // 0.5 -> 1/2
    // 0.25 -> 1/4
    // 0.75 -> 3/4
    // 0.333 -> 1/3
    // 0.666 -> 2/3
    // Use an algorithm for general case: Farey Sequence or Continued Fractions
    // Limit denominator to reasonable size (e.g. 100)
    
    const { n, d } = approximateFraction(fractional);
    
    if (whole === 0) {
        return `${sign}${n}/${d}`;
    }
    return `${sign}${whole} ${n}/${d}`;
}

// Continued Fraction approach for best approximation
function approximateFraction(x) {
    if (x === 0) return { n: 0, d: 1 };
    
    const tolerance = 1.0E-4;
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
    let b = x;
    
    const maxDenom = 1000;
    
    do {
        const a = Math.floor(b);
        let aux = h1; h1 = a * h1 + h2; h2 = aux;
        aux = k1; k1 = a * k1 + k2; k2 = aux;
        b = 1 / (b - a);
    } while (Math.abs(x - h1 / k1) > x * tolerance && k1 < maxDenom);
    
    return { n: h1, d: k1 };
}

function gcd(a, b) {
    return b ? gcd(b, a % b) : a;
}

export default formatQuantity;
