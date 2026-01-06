
/**
 * Fraction Utility for precise quantity tracking
 * Upgraded with BigInt, Strict Integers, and comparison methods.
 */

// GCD for BigInt (Always returns positive)
const gcd = (a, b) => {
  return b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b);
};

class Fraction {
  constructor(numerator, denominator = 1) {
    // Ensure inputs are BigInt-compatible integers
    try {
        this.n = BigInt(numerator);
        this.d = BigInt(denominator);
    } catch (e) {
        throw new Error("Fraction numerator and denominator must be integers or BigInts.");
    }
    
    if (this.d === 0n) {
      throw new Error("Denominator cannot be zero");
    }
    
    this.simplify();
  }

  simplify() {
    const common = gcd(this.n, this.d);
    this.n = this.n / common;
    this.d = this.d / common;
    if (this.d < 0n) {
      this.n = -this.n;
      this.d = -this.d;
    }
    return this;
  }

  add(other) {
    // a/b + c/d = (ad + bc) / bd
    const ad = this.n * other.d;
    const bc = other.n * this.d;
    return new Fraction(ad + bc, this.d * other.d);
  }

  subtract(other) {
    // a/b - c/d = (ad - bc) / bd
    const ad = this.n * other.d;
    const bc = other.n * this.d;
    return new Fraction(ad - bc, this.d * other.d);
  }

  multiply(other) {
    return new Fraction(this.n * other.n, this.d * other.d);
  }
  
  divide(other) {
      if (other.n === 0n) throw new Error("Division by zero");
      return new Fraction(this.n * other.d, this.d * other.n);
  }
  
  divide(other) {
      if (other.n === 0n) throw new Error("Division by zero");
      return new Fraction(this.n * other.d, this.d * other.n);
  }

  static from(value) {
    if (value instanceof Fraction) return value;
    if (typeof value === 'number') {
        if (Number.isInteger(value)) return new Fraction(value, 1);
        return Fraction.fromFloat(value);
    }
    if (typeof value === 'bigint') return new Fraction(value, 1n);
    if (typeof value === 'string') {
        if (value.includes('/')) {
            const [n, d] = value.split('/').map(v => v.trim());
            return new Fraction(n, d);
        }
        return Fraction.fromFloat(parseFloat(value));
    }
    throw new Error(`Cannot convert ${value} to Fraction`);
  }

  static fromFloat(value, maxDenom = 10000) {
      if (isNaN(value)) throw new Error("Invalid number");
      
      // Handle exact integers (or close enough)
      if (Math.abs(value - Math.round(value)) < 1e-10) {
          return new Fraction(Math.round(value), 1);
      }
      
      const sign = value < 0 ? -1n : 1n;
      value = Math.abs(value);
      
      // Continued Fraction Approximation
      let h1 = 1n, h2 = 0n, k1 = 0n, k2 = 1n;
      let b = value;
      
      do {
          const a = BigInt(Math.floor(b));
          let aux = h1; h1 = a * h1 + h2; h2 = aux;
          aux = k1; k1 = a * k1 + k2; k2 = aux;
          b = 1 / (b - Math.floor(b));
      } while (Math.abs(value - Number(h1) / Number(k1)) > value * 1.0E-6 && k1 < maxDenom);
      
      return new Fraction(sign * h1, k1);
  }

  // New Methods
  
  compare(other) {
      // a/b vs c/d <=> ad vs bc (if b,d > 0)
      // d is always positive after simplify()
      const lhs = this.n * other.d;
      const rhs = other.n * this.d;
      if (lhs < rhs) return -1;
      if (lhs > rhs) return 1;
      return 0;
  }
  
  equals(other) {
      // Since simplified, just check components
      return this.n === other.n && this.d === other.d;
  }

  toFloat() {
    // Convert to Number for float representation (precision loss possible)
    return Number(this.n) / Number(this.d);
  }

  toString() {
    return `${this.n}/${this.d}`;
  }
  
  toObject() {
      // Return as primitives (BigInt if supported by consumer, or explicit cast to safe types)
      // DB usually handles BigInt for INTEGER columns.
      return { 
          numerator: this.n, 
          denominator: this.d 
      }; 
  }
}

module.exports = Fraction;
