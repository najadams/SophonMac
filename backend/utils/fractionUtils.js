
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
