const express = require('express');
const router = express.Router();
const db = require('../data/db/supabase-db');

// Get all inventory items
router.get('/', (req, res) => {
  db.all('SELECT * FROM Inventory', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});


const newProduct = async (req, res) => {
  try {
    const {
      companyId,
      name,
      category,
      baseUnit,
      salesPrice,
      costPrice,
      onhand,
      reorderPoint,
      minimumStock,
      description,
      sku,
      barcode,
      unitConversions,
    } = req.body;

    console.log(companyId, name, salesPrice);
    // Validate required fields
    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }
    if (!name) {
      return res.status(400).json({ message: "Product name is required" });
    }
    if (!salesPrice) {
      return res.status(400).json({ message: "Sales price is required" });
    }

    // Check if company exists
    const company = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM Company WHERE id = ?", [companyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Check for existing product
    const existingProduct = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM Inventory WHERE companyId = ? AND name = ? AND deleted = 0",
        [companyId, name],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingProduct) {
      return res.status(400).json({ message: "Product already exists" });
    }

    // Validate unitConversions if provided
    if (unitConversions && Array.isArray(unitConversions)) {
      for (const unit of unitConversions) {
        if (
          !unit.fromUnit ||
          !unit.toUnit ||
          !unit.conversionRate ||
          !unit.salesPrice
        ) {
          return res.status(400).json({
            message:
              "Each unit must have fromUnit, toUnit, conversionRate, and unitPrice",
          });
        }
        if (unit.conversionRate <= 0) {
          return res.status(400).json({
            message: "Conversion rate must be greater than 0",
          });
        }
      }
    }

    // Set default values and create product
    const productData = {
      companyId,
      name,
      category: category || "none",
      baseUnit: baseUnit || "none",
      costPrice: costPrice || 0,
      salesPrice,
      onhand: onhand || 0,
      reorderPoint: reorderPoint || 0,
      minimumStock: minimumStock || 0,
      description: description || "",
      sku: sku || "",
      barcode: barcode || "",
      deleted: 0,
      allowsUnitBreakdown:
        unitConversions && unitConversions.length > 0 ? 1 : 0,
      atomicUnit: baseUnit || "none",
      lossFactor: 0,
    };

    // Insert product
    const product = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO Inventory (
          companyId, name, category, baseUnit, costPrice, salesPrice, 
          onhand, reorderPoint, minimumStock, description, sku, barcode, 
          deleted, allowsUnitBreakdown, atomicUnit, lossFactor
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productData.companyId,
          productData.name,
          productData.category,
          productData.baseUnit,
          productData.costPrice,
          productData.salesPrice,
          productData.onhand,
          productData.reorderPoint,
          productData.minimumStock,
          productData.description,
          productData.sku,
          productData.barcode,
          productData.deleted,
          productData.allowsUnitBreakdown,
          productData.atomicUnit,
          productData.lossFactor,
        ],
        function (err) {
          if (err) reject(err);
          else {
            db.get(
              "SELECT * FROM Inventory WHERE id = ?",
              [this.lastID],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          }
        }
      );
    });

    // Handle unit conversions if provided
    if (unitConversions && unitConversions.length > 0) {
      for (const unit of unitConversions) {
        const fromUnit = unit.fromUnit.trim().toLowerCase();

        // Add to InventoryUnits table
        await new Promise((resolve, reject) => {
          db.run(
            "INSERT INTO InventoryUnits (inventoryId, unit) VALUES (?, ?)",
            [product.id, fromUnit],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Add to UnitConversion table
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO UnitConversion (
              inventoryId, fromUnit, toUnit, conversionRate, unitPrice
            ) VALUES (?, ?, ?, ?, ?)`,
            [
              product.id,
              fromUnit,
              unit.toUnit.trim().toLowerCase(),
              unit.conversionRate,
              unit.salesPrice,
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    }

    // Get the complete product with unit conversions
    const productWithUnits = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          p.*,
          uc.fromUnit,
          uc.toUnit,
          uc.conversionRate,
          uc.unitPrice
        FROM Inventory p
        LEFT JOIN UnitConversion uc ON p.id = uc.inventoryId
        WHERE p.id = ?`,
        [product.id],
        (err, rows) => {
          if (err) reject(err);
          else {
            if (rows.length === 0) {
              resolve(product);
            } else {
              const productData = rows[0];
              const units = rows
                .filter((row) => row.fromUnit)
                .map((row) => ({
                  fromUnit: row.fromUnit,
                  toUnit: row.toUnit,
                  conversionRate: row.conversionRate,
                  unitPrice: row.unitPrice,
                }));

              resolve({
                ...productData,
                unitConversions: units,
              });
            }
          }
        }
      );
    });

    res.status(201).json({
      message: "Product added successfully",
      data: productWithUnits,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


// Get all products in store
const getProducts = async (req, res) => {
  try {
    const { companyId } = req.params;

    // Get all products with their related data
    const products = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          i.*,
          STRING_AGG(DISTINCT iu.unit, ',') as units,
          STRING_AGG(DISTINCT iv.vendorId::text, ',') as vendorIds
        FROM Inventory i
        LEFT JOIN InventoryUnits iu ON i.id = iu.inventoryId
        LEFT JOIN InventoryVendor iv ON i.id = iv.inventoryId
        WHERE i.companyId = $1 AND i.deleted = 0
        GROUP BY i.id`,
        [companyId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // For each product, get additional related data
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        // Get unit conversions
        const unitConversions = await new Promise((resolve, reject) => {
          db.all(
            `SELECT fromUnit, toUnit, conversionRate, unitPrice as salesPrice
             FROM UnitConversion 
             WHERE inventoryId = ?`,
            [product.id],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        // Get price history
        const priceHistory = await new Promise((resolve, reject) => {
          db.all(
            `SELECT date, costPrice, salesPrice
             FROM PriceChange 
             WHERE inventoryId = ?
             ORDER BY date DESC`,
            [product.id],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        // Get stock entries (transactions)
        const stockEntries = await new Promise((resolve, reject) => {
          db.all(
            `SELECT type, quantity, costPrice, salesPrice, expirationDate, transactionDate
             FROM StockTransaction 
             WHERE inventoryId = ?
             ORDER BY transactionDate DESC`,
            [product.id],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        // Get breakdown history
        const breakdownHistory = await new Promise((resolve, reject) => {
          db.all(
            `SELECT date, fromUnit, toUnit, quantity, loss, notes
             FROM BreakdownHistory 
             WHERE inventoryId = ?
             ORDER BY date DESC`,
            [product.id],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        // Process and format the data
        return {
          id: product.id,
          companyId: product.companyId,
          name: product.name,
          category: product.category,
          baseUnit: product.baseUnit,
          units: product.units ? product.units.split(',').filter(Boolean) : [],
          unitConversions: unitConversions,
          costPrice: product.costPrice,
          salesPrice: product.salesPrice,
          onhand: product.onhand,
          priceHistory: priceHistory,
          stockEntries: stockEntries,
          deleted: Boolean(product.deleted),
          vendorIds: product.vendorIds ? product.vendorIds.split(',').map(id => parseInt(id)).filter(Boolean) : [],
          reorderPoint: product.reorderPoint,
          minimumStock: product.minimumStock,
          description: product.description,
          sku: product.sku,
          barcode: product.barcode,
          allowsUnitBreakdown: Boolean(product.allowsUnitBreakdown),
          atomicUnit: product.atomicUnit,
          atomicUnitQuantity: product.atomicUnitQuantity,
          lossFactor: product.lossFactor,
          lastBreakdownDate: product.lastBreakdownDate,
          breakdownHistory: breakdownHistory,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        };
      })
    );

    res.status(200).json({
      products: enrichedProducts,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      companyId,
      name,
      category,
      baseUnit,
      costPrice,
      salesPrice,
      onhand,
      reorderPoint,
      minimumStock,
      description,
      sku,
      barcode,
      unitConversions,
    } = req.body;

    // Check if product exists
    const existingProduct = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM Inventory WHERE id = ?",
        [productId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // If companyId is being updated, check if company exists
    if (companyId && companyId !== existingProduct.companyId) {
      const company = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM Company WHERE id = ?", [companyId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
    }

    // Check for existing product with same name (if name is being updated)
    if (name && name !== existingProduct.name) {
      const duplicateProduct = await new Promise((resolve, reject) => {
        db.get(
          "SELECT * FROM Inventory WHERE companyId = ? AND name = ? AND deleted = 0 AND id != ?",
          [companyId || existingProduct.companyId, name, productId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (duplicateProduct) {
        return res.status(400).json({ message: "Product with this name already exists" });
      }
    }

    // Validate unitConversions if provided
    if (unitConversions && Array.isArray(unitConversions)) {
      for (const unit of unitConversions) {
        if (
          !unit.fromUnit ||
          !unit.toUnit ||
          !unit.conversionRate ||
          !unit.salesPrice
        ) {
          return res.status(400).json({
            message:
              "Each unit must have fromUnit, toUnit, conversionRate, and unitPrice",
          });
        }
        if (unit.conversionRate <= 0) {
          return res.status(400).json({
            message: "Conversion rate must be greater than 0",
          });
        }
      }
    }

    // Prepare update data with defaults
    const updateData = {
      ...(companyId !== undefined && { companyId }),
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category: category || "none" }),
      ...(baseUnit !== undefined && { baseUnit: baseUnit || "none" }),
      ...(costPrice !== undefined && { costPrice: costPrice || 0 }),
      ...(salesPrice !== undefined && { salesPrice }),
      ...(onhand !== undefined && { onhand: onhand || 0 }),
      ...(reorderPoint !== undefined && { reorderPoint: reorderPoint || 0 }),
      ...(minimumStock !== undefined && { minimumStock: minimumStock || 0 }),
      ...(description !== undefined && { description: description || "" }),
      ...(sku !== undefined && { sku: sku || "" }),
      ...(barcode !== undefined && { barcode: barcode || "" }),
    };

    // Handle unit conversions update
    if (unitConversions !== undefined) {
      updateData.allowsUnitBreakdown = unitConversions && unitConversions.length > 0 ? 1 : 0;
      if (baseUnit) {
        updateData.atomicUnit = baseUnit;
      }
    }

    // Build dynamic update query for Inventory table
    const fields = Object.keys(updateData);
    const values = fields.map((field) => updateData[field]);
    const setClause = fields.map((field) => `${field} = ?`).join(", ");

    if (fields.length === 0 && !unitConversions) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Update the main product record if there are fields to update
    if (fields.length > 0) {
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE Inventory SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          [...values, productId],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    }

    // Handle unit conversions update if provided
    if (unitConversions !== undefined) {
      // Remove existing unit conversions and units
      await new Promise((resolve, reject) => {
        db.run(
          "DELETE FROM UnitConversion WHERE inventoryId = ?",
          [productId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      await new Promise((resolve, reject) => {
        db.run(
          "DELETE FROM InventoryUnits WHERE inventoryId = ?",
          [productId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Add new unit conversions if provided
      if (unitConversions && unitConversions.length > 0) {
        for (const unit of unitConversions) {
          const fromUnit = unit.fromUnit.trim().toLowerCase();

          // Add to InventoryUnits table
          await new Promise((resolve, reject) => {
            db.run(
              "INSERT INTO InventoryUnits (inventoryId, unit) VALUES (?, ?)",
              [productId, fromUnit],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          // Add to UnitConversion table
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO UnitConversion (
                inventoryId, fromUnit, toUnit, conversionRate, unitPrice
              ) VALUES (?, ?, ?, ?, ?)`,
              [
                productId,
                fromUnit,
                unit.toUnit.trim().toLowerCase(),
                unit.conversionRate,
                unit.salesPrice,
              ],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }
    }

    // Get the updated product with unit conversions
    const updatedProductWithUnits = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          p.*,
          uc.fromUnit,
          uc.toUnit,
          uc.conversionRate,
          uc.unitPrice
        FROM Inventory p
        LEFT JOIN UnitConversion uc ON p.id = uc.inventoryId
        WHERE p.id = ?`,
        [productId],
        (err, rows) => {
          if (err) reject(err);
          else {
            if (rows.length === 0) {
              reject(new Error("Product not found after update"));
            } else {
              const productData = rows[0];
              const units = rows
                .filter((row) => row.fromUnit)
                .map((row) => ({
                  fromUnit: row.fromUnit,
                  toUnit: row.toUnit,
                  conversionRate: row.conversionRate,
                  unitPrice: row.unitPrice,
                }));

              resolve({
                ...productData,
                unitConversions: units,
              });
            }
          }
        }
      );
    });

    res.status(200).json({
      message: "Product updated successfully",
      product: updatedProductWithUnits,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const delProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    // Validate productId
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Check if product exists and is not already deleted
    const product = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM Inventory WHERE id = ? AND deleted = 0",
        [productId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found or already deleted" });
    }

    // Soft delete by setting deleted flag to 1
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE Inventory SET deleted = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
        [productId],
        function (err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new Error("No rows were updated"));
          } else {
            resolve();
          }
        }
      );
    });

    // Also clean up related data (optional - you may want to keep this for audit purposes)
    // Remove unit conversions
    await new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM UnitConversion WHERE inventoryId = ?",
        [productId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Remove inventory units
    await new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM InventoryUnits WHERE inventoryId = ?",
        [productId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.status(200).json({
      message: "Product deleted successfully",
      productId: productId
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Update product unit settings
const updateProductUnitSettings = async (req, res) => {
  try {
    const { productId } = req.params;
    const { allowsUnitBreakdown, atomicUnit, lossFactor } = req.body;

    // Check if product exists
    const product = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM Inventory WHERE id = ?",
        [productId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Build update query for unit settings
    const updates = {};
    if (allowsUnitBreakdown !== undefined)
      updates.allowsUnitBreakdown = allowsUnitBreakdown ? 1 : 0;
    if (atomicUnit) updates.atomicUnit = atomicUnit;
    if (lossFactor !== undefined) updates.lossFactor = lossFactor;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No unit settings to update" });
    }

    const fields = Object.keys(updates);
    const values = fields.map((field) => updates[field]);
    const setClause = fields.map((field) => `${field} = ?`).join(", ");

    const updatedProduct = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE Inventory SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, productId],
        function (err) {
          if (err) {
            reject(err);
          } else {
            // Get updated product
            db.get(
              "SELECT * FROM Inventory WHERE id = ?",
              [productId],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          }
        }
      );
    });

    res.status(200).json({
      message: "Product unit settings updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product unit settings:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Routes
router.post("/", newProduct);
router.get("/:companyId", getProducts);
router.patch("/:id", updateProduct); // Add PATCH route to match frontend
router.delete("/:id", delProduct);
router.put("/:productId/unit-settings", updateProductUnitSettings);

// Keep existing routes for backward compatibility
router.get("/", (req, res) => {
  db.all("SELECT * FROM Inventory WHERE deleted = 0", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.get("/item/:id", (req, res) => {
  db.get(
    "SELECT * FROM Inventory WHERE companyId = ?",
    [req.params.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      if (!row) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(row);
    }
  );
});

// Get detailed product information including restock history
router.get("/product/:companyId/:productId", async (req, res) => {
  try {
    const { companyId, productId } = req.params;

    // Get basic product information
    const product = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM Inventory WHERE id = ? AND companyId = ? AND deleted = 0`,
        [productId, companyId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get restock history from Supplies and SuppliesDetail
    const restockHistory = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          s.id as supplyId,
          s.restockDate,
          s.totalCost,
          sd.quantity,
          sd.costPrice,
          sd.salesPrice,
          sd.totalPrice,
          v.name as vendorName,
          w.name as workerName
        FROM Supplies s
        JOIN SuppliesDetail sd ON s.id = sd.suppliesId
        LEFT JOIN Vendor v ON s.supplierId = v.id
        LEFT JOIN Worker w ON s.restockedBy = w.id
        WHERE sd.name = ? AND s.companyId = ?
        ORDER BY s.restockDate DESC`,
        [product.name, companyId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get stock transactions
    const stockTransactions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          type,
          quantity,
          costPrice,
          salesPrice,
          expirationDate,
          transactionDate
        FROM StockTransaction 
        WHERE inventoryId = ?
        ORDER BY transactionDate DESC
        LIMIT 50`,
        [productId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get price history
    const priceHistory = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          date,
          costPrice,
          salesPrice
        FROM PriceChange 
        WHERE inventoryId = ?
        ORDER BY date DESC
        LIMIT 20`,
        [productId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get unit conversions
    const unitConversions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          fromUnit,
          toUnit,
          conversionRate,
          unitPrice as salesPrice
        FROM UnitConversion 
        WHERE inventoryId = ?`,
        [productId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Calculate summary statistics
    const totalRestocked = restockHistory.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalRestockValue = restockHistory.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const averageCostPrice = restockHistory.length > 0 
      ? restockHistory.reduce((sum, item) => sum + (item.costPrice || 0), 0) / restockHistory.length 
      : product.costPrice;

    const productDetails = {
      ...product,
      restockHistory,
      stockTransactions,
      priceHistory,
      unitConversions,
      summary: {
        totalRestocked,
        totalRestockValue,
        averageCostPrice,
        restockCount: restockHistory.length,
        lastRestockDate: restockHistory.length > 0 ? restockHistory[0].restockDate : null
      }
    };

    res.status(200).json(productDetails);
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ error: error.message });
  }
});




module.exports = router;