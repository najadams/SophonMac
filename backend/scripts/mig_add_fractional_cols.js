
const db = require('../data/db/db');
const Fraction = require('../utils/fractionUtils');

async function migrate() {
  console.log("Starting migration: Add fractional columns to Inventory...");

  try {
    // 1. Add columns if not exist
    try {
      db.run("ALTER TABLE Inventory ADD COLUMN quantity_numerator INTEGER DEFAULT 0");
      console.log("Added column quantity_numerator");
    } catch (e) {
      if (!e.message.includes("duplicate column")) console.error(e.message);
    }

    try {
      db.run("ALTER TABLE Inventory ADD COLUMN quantity_denominator INTEGER DEFAULT 1");
      console.log("Added column quantity_denominator");
    } catch (e) {
      if (!e.message.includes("duplicate column")) console.error(e.message);
    }

    // 2. Iterate all items and populate columns
    const items = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM Inventory", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`Found ${items.length} items to update.`);

    for (const item of items) {
      let num = 0;
      let den = 1;

      if (Number.isInteger(item.onhand)) {
        num = item.onhand;
        den = 1;
      } else {
        // Try to handle float
        let foundFraction = false;
        
        // Search conversions
        if (item.allowsUnitBreakdown) {
          const conversions = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM UnitConversion WHERE inventoryId = ?", [item.id], (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            });
          });

          // Check if any conversion rate explains the fraction
          for (const conv of conversions) {
            const rate = conv.conversionRate;
            if (rate > 1) {
              const candidateNum = Math.round(item.onhand * rate);
              const candidateDiff = Math.abs((candidateNum / rate) - item.onhand);
              
              if (candidateDiff < 0.001) {
                num = candidateNum;
                den = rate;
                foundFraction = true;
                console.log(`Recovered fraction for ${item.name}: ${num}/${den} (Rate: ${rate})`);
                break;
              }
            }
          }
        }

        if (!foundFraction) {
          // Default fallbacks or precision keeping
           // If it's something like 0.5, Try common denominators?
           // Or just round it if it's very close
           
           if (Math.abs(Math.round(item.onhand) - item.onhand) < 0.0001) {
               num = Math.round(item.onhand);
               den = 1;
           } else {
               // Use high precision defaults
               // Actually using the created Fraction class to approximate?
               // The Fraction class I wrote primarily expects Ints or scales up.
               // Let's create a Fraction from float using the util
               const f = new Fraction(item.onhand, 1);
               num = f.n;
               den = f.d;
               console.log(` approximated fraction for ${item.name}: ${num}/${den}`);
           }
        }
      }

      // Simplify
      const f = new Fraction(num, den);
      
      // Update DB
      await new Promise((resolve, reject) => {
        db.run(
          "UPDATE Inventory SET quantity_numerator = ?, quantity_denominator = ? WHERE id = ?",
          [f.n, f.d, item.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    console.log("Migration completed successfully.");

  } catch (err) {
    console.error("Migration failed:", err);
  }
}

migrate();
