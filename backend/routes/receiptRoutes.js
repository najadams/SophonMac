const express = require("express");
const router = express.Router();
const db = require("../data/db/db");

// Helper function to format date for SQLite
const formatDateForSql = (date) => {
  return date.toISOString().slice(0, 19).replace("T", " ");
};

// Get receipts for date range (overall)
router.get("/overall/:companyId", (req, res) => {
  try {
    const { companyId } = req.params;
    let { dateRange } = req.query;

    // Parse the dateRange if it's a JSON string
    if (dateRange && typeof dateRange === "string") {
      try {
        dateRange = JSON.parse(dateRange);
      } catch (e) {
        console.error("Error parsing dateRange:", e);
        return res.status(400).json({ error: "Invalid date range format" });
      }
    }

    let startDate, endDate;

    // Set the date filter based on the dateRange parameter
    if (dateRange) {
      if (dateRange.type === "month" && dateRange.month) {
        // Month format should be YYYY-MM
        const [year, month] = dateRange.month.split("-");
        startDate = new Date(parseInt(year), parseInt(month) - 1, 1); // Start of the month
        endDate = new Date(parseInt(year), parseInt(month), 0); // End of the month
        endDate.setHours(23, 59, 59, 999); // Set to end of day
      } else if (
        dateRange.type === "custom" &&
        dateRange.startDate &&
        dateRange.endDate
      ) {
        startDate = new Date(dateRange.startDate);
        endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999); // Set to end of day
      }
    }

    // If no valid dateRange provided, default to current month
    if (!startDate || !endDate) {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the current month
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of the current month
      endDate.setHours(23, 59, 59, 999); // Set to end of day
    }

    // Format dates for SQLite
    const formattedStartDate = formatDateForSql(startDate);
    const formattedEndDate = formatDateForSql(endDate);

    // Get receipts from SQLite database
    const sql = `
      SELECT r.*, 
             c.name as customerName, 
             c.company as customerCompany, 
             w.name as workerName
      FROM Receipt r
      LEFT JOIN Customer c ON r.customerId = c.id
      LEFT JOIN Worker w ON r.workerId = w.id
      WHERE r.companyId = ?
      AND r.createdAt >= ?
      AND r.createdAt <= ?
      AND (r.flagged = 0 OR r.flagged IS NULL)
      ORDER BY r.createdAt DESC
    `;

    db.all(
      sql,
      [companyId, formattedStartDate, formattedEndDate],
      (err, receipts) => {
        if (err) {
          console.error("Error in overall function:", err);
          return res.status(500).json({ error: err.message });
        }

        // Get receipt details for all receipts
        const receiptIds = receipts.map((r) => r.id);

        if (receiptIds.length === 0) {
          return res.status(200).json(
            receipts.map((receipt) => ({
              id: receipt.id,
              companyId: receipt.companyId,
              customerId: {
                id: receipt.customerId,
                name: receipt.customerName,
                company: receipt.customerCompany,
              },
              workerName: receipt.workerName,
              detail: [],
              total: receipt.total,
              amountPaid: receipt.amountPaid,
              discount: receipt.discount,
              profit: receipt.profit,
              createdAt: receipt.createdAt,
              balance: receipt.balance,
              flagged: receipt.flagged,
              paymentMethod: receipt.paymentMethod || "cash",
            }))
          );
        }

        const placeholders = receiptIds.map(() => "?").join(",");
        db.all(
          `SELECT * FROM ReceiptDetail WHERE receiptId IN (${placeholders})`,
          receiptIds,
          (err, details) => {
            if (err) {
              console.error("Error fetching receipt details:", err);
              return res.status(500).json({ error: err.message });
            }

            // Map details to receipts
            const detailsByReceiptId = {};
            details.forEach((detail) => {
              if (!detailsByReceiptId[detail.receiptId]) {
                detailsByReceiptId[detail.receiptId] = [];
              }
              // Calculate price per sales unit
              const conversionRate = detail.conversionRate || 1;
              const pricePerSalesUnit = detail.salesPrice * conversionRate;
              
              detailsByReceiptId[detail.receiptId].push({
                name: detail.name,
                quantity: detail.originalQuantity || detail.quantity,
                costPrice: detail.costPrice,
                salesPrice: pricePerSalesUnit, // Price per sales unit
                price: pricePerSalesUnit, // Also set price field for compatibility
                profit:
                  (detail.salesPrice - detail.costPrice) * detail.quantity,
                salesUnit: detail.salesUnit,
                originalQuantity: detail.originalQuantity,
                baseUnitQuantity: detail.baseUnitQuantity || detail.quantity,
                conversionRate: detail.conversionRate || 1,
                atomicQuantity: detail.atomicQuantity,
                totalPrice: detail.totalPrice,
              });
            });

            const result = receipts.map((receipt) => ({
              id: receipt.id,
              companyId: receipt.companyId,
              customerId: {
                id: receipt.customerId,
                name: receipt.customerName,
                company: receipt.customerCompany,
              },
              workerName: receipt.workerName,
              detail: detailsByReceiptId[receipt.id] || [],
              total: receipt.total,
              amountPaid: receipt.amountPaid,
              discount: receipt.discount,
              profit: receipt.profit,
              createdAt: receipt.createdAt,
              balance: receipt.balance,
              flagged: receipt.flagged,
              paymentMethod: receipt.paymentMethod || "cash",
            }));

            res.status(200).json(result);
          }
        );
      }
    );
  } catch (error) {
    console.error("Error in overall function:", error);
    res.status(500).send(error?.message || error);
  }
});

// function to get receipts based on dates
const getReceipts = async (companyId, date) => {
  return new Promise((resolve, reject) => {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    const formattedDate = formatDateForSql(date);
    const formattedNextDay = formatDateForSql(nextDay);

    db.all(
      `
      SELECT r.*, w.name as workerName, c.name as customerName, c.company as customerCompany
      FROM Receipt r
      LEFT JOIN Worker w ON r.workerId = w.id
      LEFT JOIN Customer c ON r.customerId = c.id
      WHERE r.companyId = ?
      AND r.createdAt >= ?
      AND r.createdAt < ?
    `,
      [companyId, formattedDate, formattedNextDay],
      (err, receipts) => {
        if (err) {
          return reject(err);
        }

        // Get receipt details
        const receiptIds = receipts.map((r) => r.id);

        if (receiptIds.length === 0) {
          return resolve(
            receipts.map((receipt) => ({
              _id: receipt.id,
              companyId: receipt.companyId,
              workerName: receipt.workerName,
              customerName: receipt.customerName || "Unknown",
              customerCompany: receipt.customerCompany,
              detail: [],
              total: receipt.total,
              amountPaid: receipt.amountPaid,
              discount: receipt.discount,
              profit: receipt.profit,
              date: receipt.createdAt,
              balance: receipt.balance,
              flagged: receipt.flagged,
              paymentMethod: receipt.paymentMethod,
            }))
          );
        }

        const placeholders = receiptIds.map(() => "?").join(",");
        db.all(
          `
          SELECT * FROM ReceiptDetail
          WHERE receiptId IN (${placeholders})
        `,
          receiptIds,
          (err, details) => {
            if (err) {
              return reject(err);
            }

            // Map details to receipts
            const detailsByReceiptId = {};
            details.forEach((detail) => {
              if (!detailsByReceiptId[detail.receiptId]) {
                detailsByReceiptId[detail.receiptId] = [];
              }
              detailsByReceiptId[detail.receiptId].push({
                name: detail.name,
                quantity: detail.originalQuantity || detail.quantity,
                costPrice: detail.costPrice,
                salesPrice: detail.salesPrice,
                salesUnit: detail.salesUnit,
                originalQuantity: detail.originalQuantity,
                baseUnitQuantity: detail.baseUnitQuantity || detail.quantity,
                conversionRate: detail.conversionRate || 1,
                atomicQuantity: detail.atomicQuantity,
                totalPrice: detail.totalPrice,
              });
            });

            const result = receipts.map((receipt) => ({
              _id: receipt.id,
              companyId: receipt.companyId,
              workerName: receipt.workerName,
              customerName: receipt.customerName || "Unknown",
              customerCompany: receipt.customerCompany,
              detail: detailsByReceiptId[receipt.id] || [],
              total: receipt.total,
              amountPaid: receipt.amountPaid,
              discount: receipt.discount,
              profit: receipt.profit,
              date: receipt.createdAt,
              balance: receipt.balance,
              flagged: receipt.flagged,
              paymentMethod: receipt.paymentMethod,
            }));

            resolve(result);
          }
        );
      }
    );
  });
};

const getAllReceipts = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const dateParam = req.query.date;
    let date;

    if (dateParam) {
      date = new Date(dateParam);
      if (isNaN(date)) {
        throw new Error("Invalid date parameter");
      }
    } else {
      date = new Date();
    }

    date.setHours(0, 0, 0, 0); // Start of the day

    const receipts = await getReceipts(companyId, date);
    res.status(200).send(receipts);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(400).send({ message: error.message });
  }
};

router.get("/:companyId", getAllReceipts);

const newReceipts = async (req, res) => {
  try {
    const {
      companyId,
      workerId,
      customerName,
      amountPaid,
      products,
      discount = 0,
      total,
      checkDebt,
      paymentMethod,
    } = req.body;
    console.log(req.body);

    if (!Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ message: "Products must be a non-empty array" });
    }

    // Begin transaction
    db.exec("BEGIN");

    const [company, name] = customerName
      .split(" - ")
      .map((str) => str?.toLowerCase().trim());

    // Fetch customer using callback-based API
    const customer = await new Promise((resolve, reject) => {
      const customerQuery = `
        SELECT * FROM Customer 
        WHERE LOWER(name) = ? AND belongsTo = ? AND LOWER(company) = ?
      `;
      db.get(customerQuery, [name, companyId, company], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!customer) {
      db.exec("ROLLBACK");
      throw new Error("Customer not found");
    }

    // Fetch worker if provided
    let worker = null;
    if (workerId) {
      worker = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM Worker WHERE id = ?`, [workerId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (!worker) {
        db.exec("ROLLBACK");
        throw new Error("Worker not found");
      }
    }

    // Fetch inventory items
    const productNames = products.map((p) => p.name.trim().toLowerCase());
    const placeholders = productNames.map(() => "?").join(", ");
    const inventoryQuery = `
      SELECT * FROM Inventory 
      WHERE LOWER(name) IN (${placeholders}) AND companyId = ? AND deleted = 0
    `;

    const inventoryItems = await new Promise((resolve, reject) => {
      db.all(inventoryQuery, [...productNames, companyId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) {
      db.exec("ROLLBACK");
      throw new Error(
        "No matching inventory items found for the provided product names."
      );
    }

    const inventoryMap = new Map(
      inventoryItems.map((item) => [item.name.toLowerCase(), item])
    );

    const receiptDetails = [];
    let totalProfit = 0;
    let calculatedTotal = 0;

    for (const product of products) {
      const formattedName = product.name.trim().toLowerCase();
      const inventoryItem = inventoryMap.get(formattedName);

      if (!inventoryItem) {
        const availableItems = Array.from(inventoryMap.keys());
        throw new Error(
          `Inventory item not found for product: "${
            product.name
          }". Available items: [${availableItems.join(", ")}]`
        );
      }

      let quantityInBaseUnit = product.quantity;
      let atomicQuantity = product.quantity;
      let conversionRate = 1;
      let loss = 0;
      let salesPricePerUnit = product.price || inventoryItem.salesPrice;
      let costPricePerUnit = inventoryItem.costPrice;
      let itemTotalPrice = product.totalPrice || salesPricePerUnit * product.quantity;

      if (
        product.unit &&
        product.unit !== inventoryItem.baseUnit &&
        product.unit !== "none"
      ) {
        const conversion = await new Promise((resolve, reject) => {
          const conversionQuery = `
            SELECT * FROM UnitConversion 
            WHERE inventoryId = ? AND toUnit = ?
          `;
          db.get(
            conversionQuery,
            [inventoryItem.id, product.unit],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (!conversion) {
          throw new Error(
            `No conversion found for unit ${product.unit} in product ${product.name}`
          );
        }

        conversionRate = conversion.conversionRate;
        quantityInBaseUnit = product.quantity / conversionRate;
        
        // Use the unit-specific sales price from conversion if available, otherwise calculate from base price
        salesPricePerUnit = conversion.unitPrice || (inventoryItem.salesPrice * conversionRate);
        
        // Calculate cost price per sales unit
        costPricePerUnit = inventoryItem.costPrice / conversionRate;
        
        // Calculate total price based on sales unit quantity and price
        itemTotalPrice = product.totalPrice || salesPricePerUnit * product.quantity;

        if (inventoryItem.atomicUnitQuantity) {
          atomicQuantity = product.quantity * inventoryItem.atomicUnitQuantity;
        }

        if (inventoryItem.lossFactor > 0) {
          loss = (itemTotalPrice * inventoryItem.lossFactor) / 100;
        }

        // Record breakdown history
        await new Promise((resolve, reject) => {
          const breakdownQuery = `
            INSERT INTO BreakdownHistory (
              inventoryId, date, fromUnit, toUnit, quantity, loss, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          db.run(
            breakdownQuery,
            [
              inventoryItem.id,
              new Date().toISOString(),
              inventoryItem.baseUnit,
              product.unit,
              product.quantity,
              loss,
              "Breakdown for sale",
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Update breakdown date
        await new Promise((resolve, reject) => {
          const updateBreakdownDate = `
            UPDATE Inventory SET lastBreakdownDate = ? WHERE id = ?
          `;
          db.run(
            updateBreakdownDate,
            [new Date().toISOString(), inventoryItem.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }

      // Calculate profit based on the sales unit
      const itemProfit =
        (salesPricePerUnit - costPricePerUnit) * product.quantity - loss;

      receiptDetails.push({
        name: product.name,
        quantity: quantityInBaseUnit,
        costPrice: costPricePerUnit, // Cost price per sales unit
        salesPrice: salesPricePerUnit, // Sales price per sales unit
        salesUnit: product.unit || inventoryItem.baseUnit,
        originalQuantity: product.quantity,
        baseUnitQuantity: quantityInBaseUnit,
        conversionRate: conversionRate,
        atomicQuantity: atomicQuantity,
        totalPrice: itemTotalPrice,
      });

      totalProfit += itemProfit;
      calculatedTotal += itemTotalPrice;
    }

    const finalTotal = calculatedTotal || total;
    const finalBalance = finalTotal - amountPaid - discount;

    // Insert receipt
    const receiptId = await new Promise((resolve, reject) => {
      const insertReceipt = `
        INSERT INTO Receipt (
          companyId, customerId, workerId, total, discount, 
          amountPaid, balance, profit, paymentMethod
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.run(
        insertReceipt,
        [
          companyId,
          customer.id,
          workerId || null,
          finalTotal,
          discount,
          amountPaid,
          finalBalance,
          totalProfit,
          paymentMethod,
        ],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Insert receipt details
    for (const detail of receiptDetails) {
      await new Promise((resolve, reject) => {
        const insertDetail = `
          INSERT INTO ReceiptDetail (
            receiptId, name, quantity, costPrice, salesPrice, salesUnit, 
            originalQuantity, baseUnitQuantity, conversionRate, atomicQuantity, totalPrice
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(
          insertDetail,
          [
            receiptId,
            detail.name,
            detail.quantity,
            detail.costPrice,
            detail.salesPrice,
            detail.salesUnit,
            detail.originalQuantity,
            detail.baseUnitQuantity,
            detail.conversionRate,
            detail.atomicQuantity,
            detail.totalPrice,
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Update inventory quantities
    for (const product of products) {
      const formattedName = product.name.trim().toLowerCase();
      const inventoryItem = inventoryMap.get(formattedName);

      let quantityToDeduct = product.quantity;
      let atomicQuantityToDeduct = product.quantity;

      if (product.unit && product.unit !== inventoryItem.baseUnit) {
        const conversion = await new Promise((resolve, reject) => {
          const conversionQuery = `
            SELECT * FROM UnitConversion 
            WHERE inventoryId = ? AND toUnit = ?
          `;
          db.get(
            conversionQuery,
            [inventoryItem.id, product.unit],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        quantityToDeduct = product.quantity / conversion.conversionRate;
        atomicQuantityToDeduct =
          product.quantity * (inventoryItem.atomicUnitQuantity || 1);
      }

      await new Promise((resolve, reject) => {
        // Add precision handling function at the top
        function toPrecisionInteger(value, decimals = 6) {
          return Math.round(value * Math.pow(10, decimals));
        }

        function fromPrecisionInteger(value, decimals = 6) {
          return value / Math.pow(10, decimals);
        }

        // Update the inventory update logic around line 537
        const updateInventory = `
          UPDATE Inventory 
          SET onhand = ROUND(onhand - ?, 10), 
              atomicUnitQuantity = ROUND(COALESCE(atomicUnitQuantity, 0) - ?, 10), 
              lastBreakdownDate = ?, 
              updatedAt = datetime('now') 
          WHERE id = ?
        `;
        db.run(
          updateInventory,
          [
            quantityToDeduct,
            atomicQuantityToDeduct,
            new Date().toISOString(),
            inventoryItem.id,
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Handle debt creation if balance > 0
    if (checkDebt && finalBalance > 0) {
      // Check if debt already exists for this receipt to prevent duplicates
      const existingDebt = await new Promise((resolve, reject) => {
        db.get(
          `SELECT id FROM Debt WHERE receiptId = ?`,
          [receiptId],
          (err, row) => (err ? reject(err) : resolve(row))
        );
      });

      let debtId;
      if (existingDebt) {
        // Update existing debt
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE Debt SET customerId = ?, amount = ?, status = 'pending' WHERE receiptId = ?`,
            [customer.id, finalBalance, receiptId],
            (err) => (err ? reject(err) : resolve())
          );
        });
        debtId = existingDebt.id;
      } else {
        // Create new debt
        debtId = await new Promise((resolve, reject) => {
          const insertDebt = `
            INSERT INTO Debt (
              companyId, workerId, customerId, receiptId, amount, status
            ) VALUES (?, ?, ?, ?, ?, 'pending')
          `;
          db.run(
            insertDebt,
            [companyId, workerId || null, customer.id, receiptId, finalBalance],
            function (err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      }

      // Update receipt with debt ID
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE Receipt SET debtId = ? WHERE id = ?`,
          [debtId, receiptId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Check for existing debt if requested
    if (checkDebt) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingDebt = await new Promise((resolve, reject) => {
        const debtQuery = `
          SELECT d.* FROM Debt d
          LEFT JOIN Receipt r ON d.receiptId = r.id
          WHERE d.customerId = ? AND d.companyId = ? AND d.status = ? AND d.createdAt < ?
          AND (r.flagged = 0 OR r.flagged IS NULL OR r.id IS NULL)
        `;
        db.get(
          debtQuery,
          [customer.id, companyId, "pending", today.toISOString()],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existingDebt) {
        db.exec("COMMIT");
        return res.status(200).json({
          message: "Existing debt found",
          existingDebt,
        });
      }
    }

    // Fetch the complete saved receipt with details
    const savedReceipt = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM Receipt WHERE id = ?`, [receiptId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const receiptDetailsFromDB = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM ReceiptDetail WHERE receiptId = ?`,
        [receiptId],
        (err, rows) => {
          if (err) reject(err);
          else {
            // Calculate price per sales unit for each detail
            const processedRows = rows.map(detail => {
              const conversionRate = detail.conversionRate || 1;
              const pricePerSalesUnit = detail.salesPrice * conversionRate;
              return {
                ...detail,
                salesPrice: pricePerSalesUnit,
                price: pricePerSalesUnit
              };
            });
            resolve(processedRows);
          }
        }
      );
    });

    const customerDetails = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM Customer WHERE id = ?`,
        [customer.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    const workerDetails = workerId
      ? await new Promise((resolve, reject) => {
          db.get(
            `SELECT * FROM Worker WHERE id = ?`,
            [workerId],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        })
      : null;

    const responseData = {
      ...savedReceipt,
      details: receiptDetailsFromDB,
      customer: customerDetails,
      worker: workerDetails,
      receiptDetails: receiptDetails,
    };

    db.exec("COMMIT");

    return res.status(201).json({
      savedReceipt: responseData,
      message: "Receipt created successfully",
    });
  } catch (error) {
    db.exec("ROLLBACK");
    console.error("Error adding receipt:", error);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ error: error.message || "An error occurred" });
    }
  }
};
router.post("/add", newReceipts);

// Update a receipt
const updateReceipt = async (req, res) => {
  const { receiptId } = req.params;
  const {
    customerName,
    products,
    total,
    amountPaid,
    discount,
    companyId,
    paymentMethod = "cash",
  } = req.body;

  console.log("this is from the update function  ", req.body);
  try {
    // Get existing receipt
    const receipt = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM Receipt WHERE id = ?`, [receiptId], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    let [company, name] = customerName.split(" - ");
    name = name.toLowerCase();
    company = company?.toLowerCase().trim();

    const customerQuery =
      company && company !== "nocompany"
        ? `SELECT * FROM Customer WHERE LOWER(name) = ? AND LOWER(company) = ? AND belongsTo = ?`
        : `SELECT * FROM Customer WHERE LOWER(name) = ? AND belongsTo = ?`;

    const customerParams =
      company && company !== "nocompany"
        ? [name, company, companyId]
        : [name, companyId];

    const customer = await new Promise((resolve, reject) => {
      db.get(customerQuery, customerParams, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const customerId = customer.id;

    // Get original receipt details from ReceiptDetail table
    const originalDetails = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM ReceiptDetail WHERE receiptId = ?`,
        [receiptId],
        (err, rows) => {
          if (err) return reject(err);
          // Calculate price per sales unit for each detail
          const processedRows = rows.map(detail => {
            const conversionRate = detail.conversionRate || 1;
            const pricePerSalesUnit = detail.salesPrice * conversionRate;
            return {
              ...detail,
              salesPrice: pricePerSalesUnit,
              price: pricePerSalesUnit
            };
          });
          resolve(processedRows);
        }
      );
    });

    const originalProducts = new Map();
    originalDetails.forEach((item) => {
      // Use originalQuantity (sales units) instead of quantity (base units) for proper comparison
      const originalSalesQuantity = item.originalQuantity || item.quantity;
      originalProducts.set(item.name, originalSalesQuantity);
    });

    const receiptDetails = [];
    let totalProfit = 0;
    let calculatedTotal = 0;

    for (const product of products) {
      const inventoryItem = await new Promise((resolve, reject) => {
        db.get(
          `SELECT * FROM Inventory WHERE LOWER(name) = ? AND companyId = ? AND deleted = 0`,
          [product.name.toLowerCase().trim(), companyId],
          (err, row) => {
            if (err) return reject(err);
            resolve(row);
          }
        );
      });

      if (!inventoryItem) {
        throw new Error(
          `Inventory item not found for product: ${product.name}`
        );
      }

      const originalQuantity = originalProducts.get(product.name) || 0;
      const newQuantity = product.quantity;
      
      // Calculate quantity difference in base units for proper inventory update
      let quantityDifferenceInBaseUnits;
      
      if (product.unit && product.unit !== inventoryItem.baseUnit && product.unit !== "none") {
        // For unit conversions, convert both quantities to base units before calculating difference
        const conversion = await new Promise((resolve, reject) => {
          db.get(
            `SELECT * FROM UnitConversion WHERE inventoryId = ? AND toUnit = ?`,
            [inventoryItem.id, product.unit],
            (err, row) => {
              if (err) return reject(err);
              resolve(row);
            }
          );
        });
        
        if (!conversion) {
          throw new Error(`No conversion found for unit ${product.unit}`);
        }
        
        const originalQuantityInBaseUnits = originalQuantity / conversion.conversionRate;
        const newQuantityInBaseUnits = newQuantity / conversion.conversionRate;
        quantityDifferenceInBaseUnits = newQuantityInBaseUnits - originalQuantityInBaseUnits;
      } else {
        // No unit conversion, quantities are already in base units
        quantityDifferenceInBaseUnits = newQuantity - originalQuantity;
      }
      
      const newOnHand = inventoryItem.onhand - quantityDifferenceInBaseUnits;

      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE Inventory SET onhand = ? WHERE id = ?`,
          [newOnHand, inventoryItem.id],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });

      let quantityInBaseUnit = product.quantity;
      let quantityInAtomicUnit = product.quantity;
      let conversionRate = 1;
      let itemTotalPrice = product.totalPrice;
      let loss = 0;

      if (
        product.unit &&
        product.unit !== inventoryItem.baseUnit &&
        product.unit !== "none"
      ) {
        const conversion = await new Promise((resolve, reject) => {
          db.get(
            `SELECT * FROM UnitConversion WHERE inventoryId = ? AND toUnit = ?`,
            [inventoryItem.id, product.unit],
            (err, row) => {
              if (err) return reject(err);
              resolve(row);
            }
          );
        });

        if (!conversion) {
          throw new Error(`No conversion found for unit ${product.unit}`);
        }

        conversionRate = conversion.conversionRate;
        quantityInBaseUnit = product.quantity / conversionRate;
        // itemTotalPrice should be calculated using the sales unit price and quantity
        // This will be recalculated later based on the actual sales price per unit

        if (inventoryItem.atomicUnitQuantity) {
          quantityInAtomicUnit =
            product.quantity * inventoryItem.atomicUnitQuantity;
        }

        if (inventoryItem.lossFactor > 0) {
          loss = (itemTotalPrice * inventoryItem.lossFactor) / 100;
        }

        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO BreakdownHistory (
              inventoryId, date, fromUnit, toUnit, quantity, loss, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              inventoryItem.id,
              new Date().toISOString(),
              inventoryItem.baseUnit,
              product.unit,
              product.quantity,
              loss,
              "Breakdown for sale",
            ],
            (err) => (err ? reject(err) : resolve())
          );
        });

        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE Inventory SET lastBreakdownDate = ? WHERE id = ?`,
            [new Date().toISOString(), inventoryItem.id],
            (err) => (err ? reject(err) : resolve())
          );
        });
      }

      // Calculate cost price and sales price per unit for the selected unit
       let costPricePerUnit = inventoryItem.costPrice;
       let salesPricePerUnit = inventoryItem.salesPrice;
       
       if (product.unit && product.unit !== inventoryItem.baseUnit && product.unit !== "none") {
         // For unit conversions, calculate per-unit prices for the selected unit
         const conversion = await new Promise((resolve, reject) => {
           db.get(
             `SELECT * FROM UnitConversion WHERE inventoryId = ? AND toUnit = ?`,
             [inventoryItem.id, product.unit],
             (err, row) => {
               if (err) return reject(err);
               resolve(row);
             }
           );
         });
         
         if (conversion && conversion.unitPrice) {
           salesPricePerUnit = conversion.unitPrice;
         } else {
           salesPricePerUnit = inventoryItem.salesPrice * conversionRate;
         }
         
         // Cost price per unit = base cost price / conversion rate
          costPricePerUnit = inventoryItem.costPrice / conversionRate;
       }
       
       // Calculate itemTotalPrice based on the sales unit price and quantity
       itemTotalPrice = salesPricePerUnit * product.quantity;
       
       const itemProfit = (salesPricePerUnit - costPricePerUnit) * product.quantity - loss;
       totalProfit += itemProfit;
       calculatedTotal += itemTotalPrice;

      receiptDetails.push({
        name: product.name,
        quantity: quantityInBaseUnit,
        atomicQuantity: quantityInAtomicUnit,
        costPrice: costPricePerUnit, // Cost price per sales unit
        salesPrice: salesPricePerUnit, // Sales price per sales unit
        totalPrice: itemTotalPrice,
        conversionRate,
        needsConversion:
          product.unit && product.unit !== inventoryItem.baseUnit,
        originalUnit: product.unit || inventoryItem.baseUnit,
        originalQuantity: product.quantity,
        loss,
        atomicUnit: inventoryItem.atomicUnit,
        salesUnit: product.unit || inventoryItem.baseUnit,
        baseUnitQuantity: quantityInBaseUnit,
      });
    }

    const balance = calculatedTotal - amountPaid - (discount || 0);

    // Update receipt
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE Receipt SET customerId = ?, total = ?, amountPaid = ?, discount = ?, balance = ?, profit = ?, paymentMethod = ? WHERE id = ?`,
        [
          customerId,
          calculatedTotal,
          amountPaid,
          discount,
          balance,
          totalProfit,
          paymentMethod,
          receiptId,
        ],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // Delete existing receipt details
    await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM ReceiptDetail WHERE receiptId = ?`,
        [receiptId],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // Insert new receipt details
    for (const detail of receiptDetails) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO ReceiptDetail (receiptId, name, quantity, costPrice, salesPrice, salesUnit, originalQuantity, baseUnitQuantity, conversionRate, atomicQuantity, totalPrice) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            receiptId,
            detail.name,
            detail.quantity,
            detail.costPrice,
            detail.salesPrice,
            detail.salesUnit,
            detail.originalQuantity,
            detail.baseUnitQuantity,
            detail.conversionRate,
            detail.atomicQuantity,
            detail.totalPrice,
          ],
          (err) => (err ? reject(err) : resolve())
        );
      });
    }

    // Handle debt
    if (balance > 0) {
      if (receipt.debtId) {
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE Debt SET customerId = ?, amount = ? WHERE id = ?`,
            [customerId, balance, receipt.debtId],
            (err) => (err ? reject(err) : resolve())
          );
        });
      } else {
        // Check if debt already exists for this receipt to prevent duplicates
        const existingDebt = await new Promise((resolve, reject) => {
          db.get(
            `SELECT id FROM Debt WHERE receiptId = ?`,
            [receiptId],
            (err, row) => (err ? reject(err) : resolve(row))
          );
        });

        if (existingDebt) {
          // Update existing debt
          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE Debt SET customerId = ?, amount = ?, status = 'pending' WHERE receiptId = ?`,
              [customerId, balance, receiptId],
              (err) => (err ? reject(err) : resolve())
            );
          });

          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE Receipt SET debtId = ? WHERE id = ?`,
              [existingDebt.id, receiptId],
              (err) => (err ? reject(err) : resolve())
            );
          });
        } else {
          // Create new debt
          const newDebtId = await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO Debt (companyId, workerId, customerId, receiptId, amount, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
              [companyId, receipt.workerId, customerId, receipt.id, balance],
              function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
              }
            );
          });

          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE Receipt SET debtId = ? WHERE id = ?`,
              [newDebtId, receiptId],
              (err) => (err ? reject(err) : resolve())
            );
          });
        }
      }
    } else if (receipt.debtId) {
      await new Promise((resolve, reject) => {
        db.run(`DELETE FROM Debt WHERE id = ?`, [receipt.debtId], (err) =>
          err ? reject(err) : resolve()
        );
      });

      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE Receipt SET debtId = NULL WHERE id = ?`,
          [receiptId],
          (err) => (err ? reject(err) : resolve())
        );
      });
    }

    res.json({
      message: "Receipt updated successfully",
      receiptId: receiptId,
    });
  } catch (error) {
    console.error("Error updating receipt:", error);
    res
      .status(500)
      .json({ message: "Failed to update receipt", error: error.message });
  }
};
router.patch("/:receiptId", updateReceipt);

// Flag/Unflag a receipt
router.patch("/:receiptId/flag", async (req, res) => {
  const { receiptId } = req.params;
  const { flagged, companyId } = req.body;

  try {
    // Validate input
    if (typeof flagged !== 'boolean') {
      return res.status(400).json({ error: "Flagged status must be a boolean" });
    }

    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required" });
    }

    // Check if receipt exists and belongs to the company
    const receipt = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM Receipt WHERE id = ? AND companyId = ?`,
        [receiptId, companyId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found or access denied" });
    }

    // Get receipt details for inventory adjustment
    const receiptDetails = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM ReceiptDetail WHERE receiptId = ?`,
        [receiptId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    // Handle inventory adjustment when flagging/unflagging
    if (flagged) {
      // When flagging: add back the sold quantities to inventory
      for (const detail of receiptDetails) {
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE Inventory 
             SET onhand = onhand + ? 
             WHERE name = ? AND companyId = ?`,
            [detail.baseUnitQuantity || detail.quantity, detail.name, companyId],
            function(err) {
              if (err) return reject(err);
              resolve();
            }
          );
        });
      }
    } else {
      // When unflagging: subtract the quantities from inventory (reverse the refill)
      for (const detail of receiptDetails) {
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE Inventory 
             SET onhand = onhand - ? 
             WHERE name = ? AND companyId = ?`,
            [detail.baseUnitQuantity || detail.quantity, detail.name, companyId],
            function(err) {
              if (err) return reject(err);
              resolve();
            }
          );
        });
      }
    }

    // Update the flagged status
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE Receipt SET flagged = ? WHERE id = ?`,
        [flagged ? 1 : 0, receiptId],
        function(err) {
          if (err) return reject(err);
          if (this.changes === 0) {
            return reject(new Error("No changes made to receipt"));
          }
          resolve();
        }
      );
    });

    // Log the flag change for audit purposes
    const action = flagged ? 'flagged' : 'unflagged';
    const inventoryAction = flagged ? 'refilled' : 'deducted from';
    console.log(`Receipt ${receiptId} has been ${action} for company ${companyId}`);
    console.log(`Inventory has been ${inventoryAction} for ${receiptDetails.length} items`);

    res.json({
      message: `Receipt ${action} successfully`,
      receiptId: receiptId,
      flagged: flagged,
      inventoryUpdated: receiptDetails.length
    });

  } catch (error) {
    console.error("Error updating receipt flag status:", error);
    res.status(500).json({ 
      error: "Failed to update flag status", 
      message: error.message 
    });
  }
});

// Delete a receipt
router.delete("/:id", (req, res) => {
  db.run("DELETE FROM Receipt WHERE id = ?", [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Receipt not found" });
    }
    res.json({ deleted: true });
  });
});

// Get single receipt by ID
router.get('/receipt/:id', (req, res) => {
  const { id } = req.params;
  
  // Get receipt details
  db.get('SELECT * FROM Receipt WHERE id = ?', [id], (err, receipt) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    // Get receipt details
    db.all('SELECT * FROM ReceiptDetail WHERE receiptId = ?', [id], (err, details) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Get customer info
      db.get('SELECT * FROM Customer WHERE id = ?', [receipt.customerId], (err, customer) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Get worker info
        db.get('SELECT * FROM Worker WHERE id = ?', [receipt.workerId], (err, worker) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({
            ...receipt,
            details,
            customer,
            worker
          });
        });
      });
    });
  });
});

module.exports = router;
