const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const dbAdapter = require("../utils/dbAdapter");

// Database connection utility
async function getDb() {
  return open({
    filename: path.join(__dirname, '../database.sqlite'),
    driver: sqlite3.Database
  });
}

// Helper function to format date for SQLite
const formatDateForSql = (date) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

// Fetch sales data (last 30 days for example)
const fetchSalesDataMonth = async (productId) => {
  const db = await getDb();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // SQLite query to aggregate sales data for the past 30 days
  const result = await db.get(`
    SELECT SUM(rd.quantity) as totalSold
    FROM ReceiptDetail rd
    JOIN Receipt r ON rd.receiptId = r.id
    WHERE rd.productId = ? 
    AND r.createdAt >= ?
    AND r.flagged = 0
  `, [productId, formatDateForSql(thirtyDaysAgo)]);
  
  // Calculate average daily sales
  return result && result.totalSold ? result.totalSold / 30 : 0;
};

// Fetch current inventory levels
const fetchInventoryData = async (productId) => {
  const db = await getDb();
  const inventory = await db.get('SELECT onhand FROM Inventory WHERE id = ?', [productId]);
  return inventory ? inventory.onhand : 0;
};

// Fetch lead time from vendor (example: static value or from Vendor collection)
const fetchLeadTime = async (vendorId) => {
  // This could be replaced with actual vendor data from SQLite
  // Example: const result = await db.get('SELECT leadTime FROM Vendor WHERE id = ?', [vendorId]);
  return 7; // Lead time in days
};

const performCalculations = async (productId, vendorId) => {
  const averageDailySales = await fetchSalesData(productId);
  const currentInventory = await fetchInventoryData(productId);
  const leadTimeDays = await fetchLeadTime(vendorId);

  // Example values for safety stock calculation
  const zFactor = 1.65; // Service level (90%)
  const demandStdDev = 5; // Example value
  const leadTimeStdDev = 2; // Example value

  const safetyStock = calculateSafetyStock(
    zFactor,
    leadTimeDays,
    demandStdDev,
    averageDailySales,
    leadTimeStdDev
  );
  const reorderPoint = calculateReorderPoint(
    averageDailySales,
    leadTimeDays,
    safetyStock
  );
  const annualDemand = averageDailySales * 365;

  const eoq = calculateEOQ(annualDemand, orderCost, holdingCost);

  // Save calculations to SQLite
  const db = await getDb();
  await db.run(`
    INSERT INTO InventoryCalculations 
    (productId, eoq, reorderPoint, safetyStock, averageDailySales, leadTimeDays, demandStdDev, leadTimeStdDev)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(productId) DO UPDATE SET
    eoq = excluded.eoq,
    reorderPoint = excluded.reorderPoint,
    safetyStock = excluded.safetyStock,
    averageDailySales = excluded.averageDailySales,
    leadTimeDays = excluded.leadTimeDays,
    demandStdDev = excluded.demandStdDev,
    leadTimeStdDev = excluded.leadTimeStdDev
  `, [
    productId, eoq, reorderPoint, safetyStock, averageDailySales, 
    leadTimeDays, demandStdDev, leadTimeStdDev
  ]);
};

const calculateReorderPoint = (
  averageDailySales,
  leadTimeDays,
  safetyStock
) => {
  return averageDailySales * leadTimeDays + safetyStock;
};

const calculateSafetyStock = (
  zFactor,
  leadTimeDays,
  demandStdDev,
  avgDailySales,
  leadTimeStdDev
) => {
  return (
    zFactor *
    Math.sqrt(
      leadTimeDays * demandStdDev ** 2 +
        avgDailySales ** 2 * leadTimeStdDev ** 2
    )
  );
};

const calculateEOQ = (annualDemand, orderCost, holdingCost) => {
  return Math.sqrt((2 * annualDemand * orderCost) / holdingCost);
};

async function updateEOQValues() {
  const db = await getDb();
  
  // Get all inventory items
  const inventories = await db.all('SELECT * FROM Inventory');

  for (const inventory of inventories) {
    const { id, onhand, costPrice, salesPrice, companyId } = inventory;

    const demand = 1000; // Placeholder for monthly demand
    const orderingCost = 50; // Placeholder for ordering cost
    const holdingCost = 0.1 * costPrice; // 10% of the cost price

    const eoq = calculateEOQ(demand, orderingCost, holdingCost);
    const safetyStock = 50; // Placeholder for safety stock
    const reorderPoint = calculateReorderPoint(demand / 30, 7, safetyStock);

    // Update or insert inventory calculations
    await db.run(`
      INSERT INTO InventoryCalculations 
      (productId, avgDailyDemands, eoq, reorderPoint, safetyStock, averageDailySales, leadTimeDays, demandStdDev, leadTimeStdDev)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(productId) DO UPDATE SET
      avgDailyDemands = excluded.avgDailyDemands,
      eoq = excluded.eoq,
      reorderPoint = excluded.reorderPoint,
      safetyStock = excluded.safetyStock,
      averageDailySales = excluded.averageDailySales,
      leadTimeDays = excluded.leadTimeDays,
      demandStdDev = excluded.demandStdDev,
      leadTimeStdDev = excluded.leadTimeStdDev
    `, [
      id, demand / 30, eoq, reorderPoint, safetyStock, 
      demand / 30, 7, 5, 2
    ]);

    // Check if on-hand stock is below reorder point
    if (inventory.onhand < reorderPoint) {
      const message = `Product ${inventory.name} is below the reorder point. Current stock: ${inventory.onhand}, Reorder Point: ${reorderPoint}`;
      
      // Create notification in SQLite
      await db.run(`
        INSERT INTO Notification (companyId, message, createdAt)
        VALUES (?, ?, datetime('now'))
      `, [companyId, message]);
    }
  }
}

// async function to send dailysales
const dailySales = async (req, res) => {
  const { companyId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const db = await getDb();
    
    const dailySales = await db.all(`
      SELECT * FROM DailySales
      WHERE companyId = ?
      AND date >= ?
      AND date <= ?
      ORDER BY date ASC
    `, [companyId, startDate, endDate]);

    res.json(dailySales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// function to update onhand value of products bought
const updateInventory = async (products, companyId) => {
  const db = await getDb();
  
  try {
    // Begin transaction
    await db.run('BEGIN TRANSACTION');
    
    for (const product of products) {
      // Find inventory item
      const inventoryItem = await db.get(`
        SELECT id, onhand FROM Inventory 
        WHERE companyId = ? AND LOWER(name) = LOWER(TRIM(?))
      `, [companyId, product.name]);
      
      if (!inventoryItem) {
        throw new Error(`Inventory item not found for product: ${product.name}`);
      }

      // Update inventory
      await db.run(`
        UPDATE Inventory
        SET onhand = onhand - ?
        WHERE id = ?
      `, [product.quantity, inventoryItem.id]);
    }
    
    // Commit transaction
    await db.run('COMMIT');
  } catch (error) {
    // Rollback in case of error
    await db.run('ROLLBACK');
    console.error("Error updating inventory:", error);
    throw error;
  }
};

const overall = async (req, res) => {
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

    const db = await getDb();
    
    // Get receipts from SQLite database
    const receipts = await db.all(`
      SELECT r.*, c.name as customerName, c.company as customerCompany, w.name as workerName
      FROM Receipt r
      LEFT JOIN Customer c ON r.customerId = c.id
      LEFT JOIN Worker w ON r.workerId = w.id
      WHERE r.companyId = ?
      AND r.createdAt >= ?
      AND r.createdAt <= ?
      AND r.flagged = 0
    `, [companyId, formattedStartDate, formattedEndDate]);

    res.status(200).json({ receipts });
  } catch (error) {
    console.error("Error in overall function:", error);
    res.status(500).send(error?.message || error);
  }
};

const getSalesAnalytics = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { startDate, endDate } = req.query;
    
    const db = await getDb();

    // Define date range
    const queryStartDate = startDate 
      ? new Date(startDate) 
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const queryEndDate = endDate ? new Date(endDate) : new Date();
    
    // Format dates for SQLite
    const formattedStartDate = formatDateForSql(queryStartDate);
    const formattedEndDate = formatDateForSql(queryEndDate);

    // Get receipts with details
    const receipts = await db.all(`
      SELECT r.id, r.total, r.paymentMethod, r.createdAt
      FROM Receipt r
      WHERE r.companyId = ?
      AND r.createdAt >= ?
      AND r.createdAt <= ?
    `, [companyId, formattedStartDate, formattedEndDate]);

    // Get receipt details
    const receiptDetails = await db.all(`
      SELECT rd.*, r.id as receiptId, r.createdAt
      FROM ReceiptDetail rd
      JOIN Receipt r ON rd.receiptId = r.id
      WHERE r.companyId = ?
      AND r.createdAt >= ?
      AND r.createdAt <= ?
    `, [companyId, formattedStartDate, formattedEndDate]);
    
    // Process receipts for analytics
    const totalSales = receipts.reduce((sum, receipt) => sum + receipt.total, 0);
    const averageTicket = receipts.length 
      ? totalSales / receipts.length 
      : 0;
    
    // Generate payment method analytics
    const paymentMethods = {};
    receipts.forEach(receipt => {
      const method = receipt.paymentMethod;
      paymentMethods[method] = (paymentMethods[method] || 0) + receipt.total;
    });

    // Calculate hourly and weekday analytics
    const hourlyAnalytics = calculateHourlyAnalytics(receipts);
    const weekdayAnalytics = calculateWeekdayAnalytics(receipts);

    const analytics = {
      totalSales,
      averageTicket,
      transactionCount: receipts.length,
      paymentMethods,
      hourlyAnalytics,
      weekdayAnalytics,
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper functions for analytics
function calculateHourlyAnalytics(receipts) {
  const hours = Array(24).fill(0);
  
  receipts.forEach(receipt => {
    const date = new Date(receipt.createdAt);
    const hour = date.getHours();
    hours[hour]++;
  });
  
  return hours;
}

function calculateWeekdayAnalytics(receipts) {
  const weekdays = Array(7).fill(0);
  
  receipts.forEach(receipt => {
    const date = new Date(receipt.createdAt);
    const day = date.getDay();
    weekdays[day]++;
  });
  
  return weekdays;
}

// get all receipts
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
    const formattedDate = formatDateForSql(date);
    
    const receipts = await getReceipts(companyId, date);
    res.status(200).send(receipts);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(400).send({ error: error.message });
  }
};

const getReceipts = async (companyId, date) => {
  const db = await getDb();
  
  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  
  const formattedDate = formatDateForSql(date);
  const formattedNextDay = formatDateForSql(nextDay);
  
  const receipts = await db.all(`
    SELECT r.*, w.name as workerName, c.name as customerName, c.company as customerCompany
    FROM Receipt r
    LEFT JOIN Worker w ON r.workerId = w.id
    LEFT JOIN Customer c ON r.customerId = c.id
    WHERE r.companyId = ?
    AND r.createdAt >= ?
    AND r.createdAt < ?
  `, [companyId, formattedDate, formattedNextDay]);
  
  // Get receipt details
  const receiptIds = receipts.map(r => r.id);
  let details = [];
  
  if (receiptIds.length > 0) {
    const placeholders = receiptIds.map(() => '?').join(',');
    details = await db.all(`
      SELECT * FROM ReceiptDetail
      WHERE receiptId IN (${placeholders})
    `, receiptIds);
  }
  
  // Map details to receipts
  const detailsByReceiptId = {};
  details.forEach(detail => {
    if (!detailsByReceiptId[detail.receiptId]) {
      detailsByReceiptId[detail.receiptId] = [];
    }
    // Calculate price per sales unit
    const conversionRate = detail.conversionRate || 1;
    const pricePerSalesUnit = detail.salesPrice * conversionRate;
    const processedDetail = {
      ...detail,
      salesPrice: pricePerSalesUnit,
      price: pricePerSalesUnit
    };
    detailsByReceiptId[detail.receiptId].push(processedDetail);
  });
  
  return receipts.map(receipt => ({
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
  }));
};

const getReceiptById = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const db = await getDb();
    
    const debt = await db.get(`
      SELECT d.*, w.name as workerName,
             c.name as customerName, c.company as customerCompany,
             r.total, r.amountPaid, r.discount, r.balance
      FROM Debt d
      LEFT JOIN Worker w ON d.workerId = w.id
      LEFT JOIN Customer c ON d.customerId = c.id
      LEFT JOIN Receipt r ON d.receiptId = r.id
      WHERE d.id = ?
    `, [receiptId]);

    if (!debt) {
      return res.status(404).json({ message: "Debt not found" });
    }
    
    // Get receipt details
    const detailsRaw = await db.all(`
      SELECT * FROM ReceiptDetail WHERE receiptId = ?
    `, [debt.receiptId]);
    
    // Calculate price per sales unit for each detail
    const details = detailsRaw.map(detail => {
      const conversionRate = detail.conversionRate || 1;
      const pricePerSalesUnit = detail.salesPrice * conversionRate;
      return {
        ...detail,
        salesPrice: pricePerSalesUnit,
        price: pricePerSalesUnit
      };
    });

    const result = {
      _id: debt.id,
      workerName: debt.workerName,
      customerName: debt.customerCompany || debt.customerName,
      detail: details,
      total: debt.total,
      amountPaid: debt.amountPaid,
      discount: debt.discount,
      date: debt.createdAt,
      balance: debt.balance,
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPaymentByDebtId = async (req, res) => {
  try {
    const { debtId } = req.params;
    const db = await getDb();
    
    // Get payments for this debt
    const payments = await db.all(`
      SELECT p.*, w.name as workerName
      FROM Payment p
      LEFT JOIN Worker w ON p.workerId = w.id
      WHERE p.debtId = ?
    `, [debtId]);

    if (payments.length === 0) {
      return res.status(404).json({ message: "No payments found for this debt" });
    }

    // Map payments to include worker names
    const paymentsWithWorkerName = payments.map((data) => {
      return {
        date: data.date,
        amountPaid: data.amountPaid,
        workerName: data.workerName || "Unknown Worker",
        paymentMethod: data.paymentMethod,
      };
    });

    res.status(200).json(paymentsWithWorkerName);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllDebts = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const dateParam = req.query.date;
    const showAllDebtors = req.query.showAllDebtors === "true";

    let startDate, endDate;

    if (!showAllDebtors && dateParam) {
      startDate = new Date(dateParam);

      if (isNaN(startDate.getTime())) {
        throw new Error("Invalid date parameter");
      }

      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
    }

    // Fetch debts based on the conditions
    const debts = await getDebt(companyId, startDate, endDate, showAllDebtors);
    res.status(200).json(debts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getDebt = async (companyId, startDate, endDate, showAllDebtors) => {
  const db = await getDb();
  
  // Build query based on parameters
  let query = `
    SELECT d.*, w.name as workerName, 
           c.name as customerName, c.company as customerCompany, c.phone as contact,
           r.flagged
    FROM Debt d
    LEFT JOIN Worker w ON d.workerId = w.id
    LEFT JOIN Customer c ON d.customerId = c.id
    LEFT JOIN Receipt r ON d.receiptId = r.id
    WHERE d.companyId = ? 
    AND d.amount >= 0.1
  `;
  
  let params = [companyId];
  
  if (!showAllDebtors && startDate && endDate) {
    query += " AND d.createdAt >= ? AND d.createdAt <= ?";
    params.push(formatDateForSql(startDate), formatDateForSql(endDate));
  }
  
  const debts = await db.all(query, params);
  
  // Filter out debts with flagged receipts
  const filteredDebts = debts.filter((debt) => !debt.flagged);

  return filteredDebts
    .map((debt) => ({
      id: debt.id,
      workerName: debt.workerName,
      customerName: debt.customerName,
      customerCompany: debt.customerCompany,
      contact: debt.contact,
      amount: debt.amount,
      date: debt.createdAt,
      balance: debt.amount,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const makePayment = async (req, res) => {
  try {
    const { debtId } = req.params;
    const { amount, workerId, paymentMethod } = req.body;
    const db = await getDb();

    if (!amount || !workerId) {
      return res
        .status(400)
        .json({ error: "Amount, workerId, and paymentMethod are required" });
    }

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    // Find the debt
    const debt = await db.get(`
      SELECT d.*, c.id as customerId, c.name as customerName, c.company as customerCompany
      FROM Debt d
      LEFT JOIN Customer c ON d.customerId = c.id
      WHERE d.id = ?
    `, [debtId]);

    if (!debt) {
      await db.run('ROLLBACK');
      return res.status(404).json({ error: "Debt not found" });
    }

    let remainingAmount = amount;

    // Log payment in DebtPayment table
    await db.run(`
      INSERT INTO DebtPayment (debtId, date, amountPaid, workerId, paymentMethod)
      VALUES (?, datetime('now'), ?, ?, ?)
    `, [debtId, amount, workerId, paymentMethod]);

    // Update the debt's amount and status
    if (remainingAmount >= debt.amount) {
      remainingAmount -= debt.amount;
      await db.run(`
        UPDATE Debt
        SET amount = 0, status = 'paid'
        WHERE id = ?
      `, [debtId]);
    } else {
      await db.run(`
        UPDATE Debt
        SET amount = amount - ?, status = 'pending'
        WHERE id = ?
      `, [remainingAmount, debtId]);
      remainingAmount = 0;
    }

    // Update the corresponding receipt's balance and amountPaid
    await db.run(`
      UPDATE Receipt
      SET balance = balance - ?, amountPaid = amountPaid + ?
      WHERE id = ?
    `, [amount - remainingAmount, amount - remainingAmount, debt.receiptId]);

    // If there is remaining payment, apply it to other debts for the same customer
    if (remainingAmount > 0) {
      const otherDebts = await db.all(`
        SELECT d.* FROM Debt d
        LEFT JOIN Receipt r ON d.receiptId = r.id
        WHERE d.customerId = ?
        AND d.id != ?
        AND d.amount > 0
        AND (r.flagged = 0 OR r.flagged IS NULL OR r.id IS NULL)
        ORDER BY d.createdAt ASC
      `, [debt.customerId, debtId]);

      for (const d of otherDebts) {
        if (remainingAmount <= 0) break;

        const paymentForThisDebt = Math.min(remainingAmount, d.amount);

        // Log payment
        await db.run(`
          INSERT INTO DebtPayment (debtId, date, amountPaid, workerId, paymentMethod)
          VALUES (?, datetime('now'), ?, ?, ?)
        `, [d.id, paymentForThisDebt, workerId, paymentMethod]);

        // Update debt
        const newStatus = d.amount === paymentForThisDebt ? 'paid' : 'pending';
        await db.run(`
          UPDATE Debt
          SET amount = amount - ?, status = ?
          WHERE id = ?
        `, [paymentForThisDebt, newStatus, d.id]);

        // Update receipt
        await db.run(`
          UPDATE Receipt
          SET amountPaid = amountPaid + ?, balance = balance - ?
          WHERE id = ?
        `, [paymentForThisDebt, paymentForThisDebt, d.receiptId]);

        remainingAmount -= paymentForThisDebt;
      }
    }

    // Commit transaction
    await db.run('COMMIT');

    // Return the updated debt and receipt details
    const updatedDebt = await db.get(`
      SELECT d.*, c.name as customerName, c.company as customerCompany
      FROM Debt d
      LEFT JOIN Customer c ON d.customerId = c.id
      WHERE d.id = ?
    `, [debtId]);

    res.status(200).json({
      message: "Payment successful",
      debt: {
        id: updatedDebt.id,
        customerName: updatedDebt.customerName,
        customerCompany: updatedDebt.customerCompany,
        totalAmount: updatedDebt.amount + amount,
        amountPaid: amount,
        balance: updatedDebt.amount,
      },
    });
  } catch (error) {
    // Rollback on error
    const db = await getDb();
    await db.run('ROLLBACK');
    console.error("Payment error:", error);
    res.status(500).json({ error: "Failed to process payment" });
  }
};

// delete a receipt
const delReceipt = async (req, res) => {
  try {
    const db = await getDb();
    
    // Begin transaction
    await db.run('BEGIN TRANSACTION');
    
    // Get receipt details first (for potential inventory restock)
    const receiptDetailsRaw = await db.all(`
      SELECT * FROM ReceiptDetail WHERE receiptId = ?
    `, [req.params.id]);
    
    // Calculate price per sales unit for each detail
    const receiptDetails = receiptDetailsRaw.map(detail => {
      const conversionRate = detail.conversionRate || 1;
      const pricePerSalesUnit = detail.salesPrice * conversionRate;
      return {
        ...detail,
        salesPrice: pricePerSalesUnit,
        price: pricePerSalesUnit
      };
    });
    
    // Delete receipt details
    await db.run(`DELETE FROM ReceiptDetail WHERE receiptId = ?`, [req.params.id]);
    
    // Delete associated debt if exists
    await db.run(`DELETE FROM Debt WHERE receiptId = ?`, [req.params.id]);
    
    // Delete the receipt
    const result = await db.run(`DELETE FROM Receipt WHERE id = ?`, [req.params.id]);
    
    if (result.changes === 0) {
      await db.run('ROLLBACK');
      return res.status(404).send({ error: "Receipt not found" });
    }
    
    // Commit transaction
    await db.run('COMMIT');
    
    res.send({ message: "Receipt deleted successfully" });
  } catch (error) {
    // Rollback on error
    const db = await getDb();
    await db.run('ROLLBACK');
    res.status(500).send(error);
  }
};

const updateReceipt = async (req, res) => {
  const { receiptId } = req.params;
  const { customerName, products, total, amountPaid, discount, companyId } =
    req.body;

  try {
    // Begin transaction
    db.exec("BEGIN");

    // Find the existing receipt
    const receipt = db
      .prepare(
        `
      SELECT * FROM receipts WHERE id = ?
    `
      )
      .get(receiptId);

    if (!receipt) {
      db.exec("ROLLBACK");
      return res.status(404).json({ message: "Receipt not found" });
    }

    let [company, name] = customerName.split(" - ");
    name = name.toLowerCase();
    company = company?.toLowerCase().trim();

    // Build customer filter
    let customerQuery = `
      SELECT * FROM customers 
      WHERE LOWER(name) = ? AND belongsTo = ?
    `;
    let customerParams = [name, companyId];

    if (company && company.toLowerCase() !== "nocompany") {
      customerQuery += ` AND LOWER(company) = ?`;
      customerParams.push(company);
    }

    // Find customer
    const customer = db.prepare(customerQuery).get(...customerParams);
    if (!customer) {
      db.exec("ROLLBACK");
      return res.status(404).json({ message: "Customer not found" });
    }
    const customerId = customer.id;

    // Get original receipt details for quantity comparison
    const originalDetails = db
      .prepare(
        `
      SELECT name, quantity FROM receipt_details WHERE receiptId = ?
    `
      )
      .all(receiptId);

    const originalProducts = new Map();
    originalDetails.forEach((item) => {
      originalProducts.set(item.name, item.quantity);
    });

    // Process receipt details and update inventory
    const receiptDetails = await Promise.all(
      products.map(async (product) => {
        const inventoryItem = db
          .prepare(
            `
        SELECT * FROM inventory 
        WHERE LOWER(name) = ? AND companyId = ?
      `
          )
          .get(product.name.toLowerCase().trim(), companyId);

        if (!inventoryItem) {
          throw new Error(
            `Inventory item not found for product: ${product.name}`
          );
        }

        // Update inventory stock
        const originalQuantity = originalProducts.get(product.name) || 0;
        const newQuantity = product.quantity;
        const quantityDifference = newQuantity - originalQuantity;

        db.prepare(
          `
        UPDATE inventory 
        SET onhand = onhand - ? 
        WHERE id = ?
      `
        ).run(quantityDifference, inventoryItem.id);

        // Handle unit conversion
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
          const conversion = db
            .prepare(
              `
          SELECT * FROM unit_conversions 
          WHERE inventoryId = ? AND toUnit = ?
        `
            )
            .get(inventoryItem.id, product.unit);

          if (!conversion) {
            throw new Error(
              `No conversion found for unit ${product.unit} in product ${product.name}`
            );
          }

          conversionRate = conversion.conversionRate;
          quantityInBaseUnit = product.quantity / conversionRate;
          itemTotalPrice = inventoryItem.price * quantityInBaseUnit;

          if (inventoryItem.atomicUnitQuantity) {
            quantityInAtomicUnit =
              product.quantity * inventoryItem.atomicUnitQuantity;
          }

          if (inventoryItem.lossFactor > 0) {
            loss = (itemTotalPrice * inventoryItem.lossFactor) / 100;
          }

          // Record breakdown history
          db.prepare(
            `
          INSERT INTO breakdown_history (
            inventoryId, date, fromUnit, toUnit, quantity, loss, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
          ).run(
            inventoryItem.id,
            new Date().toISOString(),
            inventoryItem.baseUnit,
            product.unit,
            product.quantity,
            loss,
            "Breakdown for sale"
          );

          db.prepare(
            `
          UPDATE inventory 
          SET lastBreakdownDate = ? 
          WHERE id = ?
        `
          ).run(new Date().toISOString(), inventoryItem.id);
        }

        const salesPrice = itemTotalPrice / quantityInBaseUnit;

        return {
          name: product.name,
          quantity: quantityInBaseUnit,
          atomicQuantity: quantityInAtomicUnit,
          costPrice: inventoryItem.costPrice,
          salesPrice: salesPrice,
          totalPrice: itemTotalPrice,
          conversionRate,
          needsConversion:
            product.unit && product.unit !== inventoryItem.baseUnit,
          originalUnit: product.unit || inventoryItem.baseUnit,
          originalQuantity: product.quantity,
          loss: loss,
          atomicUnit: inventoryItem.atomicUnit,
        };
      })
    );

    // Calculate totals
    const totalProfit = receiptDetails.reduce((acc, item) => {
      const itemProfit =
        (item.salesPrice - item.costPrice) * item.quantity - item.loss;
      return acc + itemProfit;
    }, 0);

    const calculatedTotal = receiptDetails.reduce((acc, item) => {
      return acc + item.totalPrice;
    }, 0);

    // Update receipt
    db.prepare(
      `
      UPDATE receipts 
      SET 
        customerId = ?,
        total = ?,
        amountPaid = ?,
        discount = ?,
        balance = ?,
        profit = ?
      WHERE id = ?
    `
    ).run(
      customerId,
      calculatedTotal || total,
      amountPaid,
      discount,
      (calculatedTotal || total) - amountPaid - (discount || 0),
      totalProfit,
      receiptId
    );

    // Delete existing receipt details
    db.prepare(
      `
      DELETE FROM receipt_details WHERE receiptId = ?
    `
    ).run(receiptId);

    // Insert new receipt details
    const insertDetail = db.prepare(`
      INSERT INTO receipt_details (
        receiptId, name, quantity, atomicQuantity, costPrice, 
        salesPrice, totalPrice, conversionRate, needsConversion,
        originalUnit, originalQuantity, loss, atomicUnit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    receiptDetails.forEach((detail) => {
      insertDetail.run(
        receiptId,
        detail.name,
        detail.quantity,
        detail.atomicQuantity,
        detail.costPrice,
        detail.salesPrice,
        detail.totalPrice,
        detail.conversionRate,
        detail.needsConversion ? 1 : 0,
        detail.originalUnit,
        detail.originalQuantity,
        detail.loss,
        detail.atomicUnit
      );
    });

    // Handle debt
    const balance = (calculatedTotal || total) - amountPaid - (discount || 0);
    if (balance > 0) {
      if (receipt.debtId) {
        db.prepare(
          `
          UPDATE debts 
          SET customerId = ?, amount = ? 
          WHERE id = ?
        `
        ).run(customerId, balance, receipt.debtId);
      } else {
        const debtInsert = db
          .prepare(
            `
          INSERT INTO debts (
            companyId, workerId, customerId, receiptId, amount
          ) VALUES (?, ?, ?, ?, ?)
        `
          )
          .run(companyId, receipt.workerId, customerId, receiptId, balance);

        db.prepare(
          `
          UPDATE receipts 
          SET debtId = ? 
          WHERE id = ?
        `
        ).run(debtInsert.lastInsertRowid, receiptId);
      }
    } else if (receipt.debtId) {
      db.prepare(
        `
        DELETE FROM debts WHERE id = ?
      `
      ).run(receipt.debtId);
      db.prepare(
        `
        UPDATE receipts 
        SET debtId = NULL 
        WHERE id = ?
      `
      ).run(receiptId);
    }

    // Fetch updated receipt
    const updatedReceipt = db
      .prepare(
        `
      SELECT * FROM receipts WHERE id = ?
    `
      )
      .get(receiptId);

    db.exec("COMMIT");

    res.json({
      message: "Receipt updated successfully",
      receipt: updatedReceipt,
    });
  } catch (error) {
    db.exec("ROLLBACK");
    console.error("Error updating receipt:", error);
    res
      .status(500)
      .json({ message: "Failed to update receipt", error: error.message });
  }
};

const newReceipts = async (req, res) => {
  try {
    const {
      companyId,
      workerId,
      customerName,
      amountPaid,
      products,
      discount,
      balance,
      total,
      checkDebt,
    } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ message: "Products must be a non-empty array" });
    }

    // Begin transaction
    db.exec("BEGIN");

    // Parse customer name and company
    const [company, name] = customerName
      .split(" - ")
      .map((str) => str?.toLowerCase().trim());

    // Fetch customer
    const customerQuery = `
      SELECT * FROM customers 
      WHERE LOWER(name) = ? AND belongsTo = ? AND LOWER(company) = ?
    `;
    const customer = db.prepare(customerQuery).get(name, companyId, company);
    if (!customer) {
      db.exec("ROLLBACK");
      throw new Error("Customer not found");
    }

    // Fetch worker
    const worker = db
      .prepare(
        `
      SELECT * FROM workers WHERE id = ?
    `
      )
      .get(workerId);
    if (!worker) {
      db.exec("ROLLBACK");
      throw new Error("Worker not found");
    }

    // Fetch inventory items
    const inventoryItems = db
      .prepare(
        `
      SELECT * FROM inventory 
      WHERE LOWER(name) IN (${products
        .map(() => "?")
        .join(",")}) AND companyId = ?
    `
      )
      .all(...products.map((p) => p.name.trim().toLowerCase()), companyId);

    // Create inventory map
    const inventoryMap = new Map(
      inventoryItems.map((item) => [item.name.toLowerCase(), item])
    );

    // Process products and create receipt details
    const receiptDetails = products.map((product) => {
      const formattedName = product.name.trim().toLowerCase();
      const inventoryItem = inventoryMap.get(formattedName);

      if (!inventoryItem) {
        throw new Error(
          `Inventory item not found for product: ${product.name}`
        );
      }

      // Handle unit conversion and breakdown
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
        const conversion = db
          .prepare(
            `
          SELECT * FROM unit_conversions 
          WHERE inventoryId = ? AND toUnit = ?
        `
          )
          .get(inventoryItem.id, product.unit);

        if (!conversion) {
          throw new Error(
            `No conversion found for unit ${product.unit} in product ${product.name}`
          );
        }

        conversionRate = conversion.conversionRate;
        quantityInBaseUnit = product.quantity / conversionRate;
        itemTotalPrice = inventoryItem.price * quantityInBaseUnit;

        if (inventoryItem.atomicUnitQuantity) {
          quantityInAtomicUnit =
            product.quantity * inventoryItem.atomicUnitQuantity;
        }

        if (inventoryItem.lossFactor > 0) {
          loss = (itemTotalPrice * inventoryItem.lossFactor) / 100;
        }

        // Record breakdown history
        db.prepare(
          `
          INSERT INTO breakdown_history (
            inventoryId, date, fromUnit, toUnit, quantity, loss, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          inventoryItem.id,
          new Date().toISOString(),
          inventoryItem.baseUnit,
          product.unit,
          product.quantity,
          loss,
          "Breakdown for sale"
        );

        db.prepare(
          `
          UPDATE inventory 
          SET lastBreakdownDate = ? 
          WHERE id = ?
        `
        ).run(new Date().toISOString(), inventoryItem.id);
      }

      const salesPrice = itemTotalPrice / quantityInBaseUnit;

      return {
        name: product.name,
        quantity: quantityInBaseUnit,
        atomicQuantity: quantityInAtomicUnit,
        costPrice: inventoryItem.costPrice,
        salesPrice: salesPrice,
        totalPrice: itemTotalPrice,
        conversionRate,
        needsConversion:
          product.unit && product.unit !== inventoryItem.baseUnit,
        originalUnit: product.unit || inventoryItem.baseUnit,
        originalQuantity: product.quantity,
        loss: loss,
        atomicUnit: inventoryItem.atomicUnit,
      };
    });

    // Calculate totals
    const totalProfit = receiptDetails.reduce((acc, item) => {
      const itemProfit =
        (item.salesPrice - item.costPrice) * item.quantity - item.loss;
      return acc + itemProfit;
    }, 0);

    const calculatedTotal = receiptDetails.reduce((acc, item) => {
      return acc + item.totalPrice;
    }, 0);

    // Generate receipt ID (using a simple UUID-like string for SQLite)
    const receiptId = require("crypto").randomUUID();

    // Insert receipt
    db.prepare(
      `
      INSERT INTO receipts (
        id, companyId, customerId, workerId, total, discount, 
        amountPaid, balance, profit, includesUnitBreakdown
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      receiptId,
      companyId,
      customer.id,
      workerId,
      calculatedTotal || total,
      discount,
      amountPaid,
      (calculatedTotal || total) - amountPaid - (discount || 0),
      totalProfit,
      receiptDetails.some((item) => item.needsConversion) ? 1 : 0
    );

    // Insert receipt details
    const insertDetail = db.prepare(`
      INSERT INTO receipt_details (
        receiptId, name, quantity, atomicQuantity, costPrice, 
        salesPrice, totalPrice, conversionRate, needsConversion,
        originalUnit, originalQuantity, loss, atomicUnit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    receiptDetails.forEach((detail) => {
      insertDetail.run(
        receiptId,
        detail.name,
        detail.quantity,
        detail.atomicQuantity,
        detail.costPrice,
        detail.salesPrice,
        detail.totalPrice,
        detail.conversionRate,
        detail.needsConversion ? 1 : 0,
        detail.originalUnit,
        detail.originalQuantity,
        detail.loss,
        detail.atomicUnit
      );
    });

    // Update inventory
    products.forEach((product) => {
      const formattedName = product.name.trim().toLowerCase();
      const inventoryItem = inventoryMap.get(formattedName);

      let quantityToDeduct = product.quantity;
      let atomicQuantityToDeduct = product.quantity;

      if (product.unit && product.unit !== inventoryItem.baseUnit) {
        const conversion = db
          .prepare(
            `
          SELECT * FROM unit_conversions 
          WHERE inventoryId = ? AND toUnit = ?
        `
          )
          .get(inventoryItem.id, product.unit);
        quantityToDeduct = product.quantity / conversion.conversionRate;

        if (inventoryItem.atomicUnitQuantity) {
          atomicQuantityToDeduct =
            product.quantity * inventoryItem.atomicUnitQuantity;
        }
      }

      db.prepare(
        `
        UPDATE inventory 
        SET 
          onhand = onhand - ?,
          atomicUnitQuantity = atomicUnitQuantity - ?,
          lastBreakdownDate = ?
        WHERE id = ?
      `
      ).run(
        quantityToDeduct,
        atomicQuantityToDeduct,
        new Date().toISOString(),
        inventoryItem.id
      );
    });

    // Check for existing debt if requested
    if (checkDebt) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingDebt = db
        .prepare(
          `
        SELECT d.* FROM debts d
        LEFT JOIN Receipt r ON d.receiptId = r.id
        WHERE d.customerId = ? AND d.companyId = ? AND d.status = ? AND d.createdAt < ?
        AND (r.flagged = 0 OR r.flagged IS NULL OR r.id IS NULL)
      `
        )
        .get(customer.id, companyId, "pending", today.toISOString());

      if (existingDebt) {
        db.exec("COMMIT");
        return res.status(200).json({
          message: "Existing debt found",
          existingDebt,
        });
      }
    }

    // Fetch saved receipt
    const savedReceipt = db
      .prepare(
        `
      SELECT * FROM receipts WHERE id = ?
    `
      )
      .get(receiptId);

    db.exec("COMMIT");

    return res.status(201).json({ savedReceipt });
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


const flagged = async (req, res) => {
  try {
    const { id } = req.params;
    const { flagged, companyId } = req.body;

    // Begin transaction
    db.exec("BEGIN");

    // Find and update the receipt
    const updateReceipt = db.prepare(`
      UPDATE receipts 
      SET flagged = ? 
      WHERE id = ?
    `);
    const updateResult = updateReceipt.run(flagged ? 1 : 0, id);

    if (updateResult.changes === 0) {
      db.exec("ROLLBACK");
      return res.status(404).json({ message: "Receipt not found" });
    }

    // Fetch the updated receipt with details
    const receipt = db
      .prepare(
        `
      SELECT r.*, rd.name, rd.quantity 
      FROM receipts r 
      LEFT JOIN receipt_details rd ON r.id = rd.receiptId 
      WHERE r.id = ?
    `
      )
      .all(id);

    if (!receipt || receipt.length === 0) {
      db.exec("ROLLBACK");
      return res.status(404).json({ message: "Receipt not found" });
    }

    // Process receipt details
    const items = receipt
      .map((item) => ({
        name: item.name,
        quantity: item.quantity,
      }))
      .filter((item) => item.name); // Filter out null names from join

    // Adjust inventory
    for (const item of items) {
      const product = db
        .prepare(
          `
        SELECT * FROM inventory 
        WHERE LOWER(name) = ? AND companyId = ?
      `
        )
        .get(item.name.toLowerCase(), companyId);

      if (product) {
        const newOnhand = flagged
          ? product.onhand + item.quantity
          : product.onhand - item.quantity;

        db.prepare(
          `
          UPDATE inventory 
          SET onhand = ? 
          WHERE id = ?
        `
        ).run(newOnhand, product.id);
      }
    }

    // Fetch the final receipt for response
    const finalReceipt = db
      .prepare(
        `
      SELECT * FROM receipts WHERE id = ?
    `
      )
      .get(id);

    db.exec("COMMIT");

    res.status(200).json(finalReceipt);
  } catch (error) {
    db.exec("ROLLBACK");
    console.error("Error updating flagged status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  delReceipt,
  getReceiptById,
  getPaymentByDebtId,
  newReceipts,
  getAllReceipts,
  getAllDebts,
  makePayment,
  getReceipts,
  overall,
  dailySales,
  flagged,
  updateReceipt,
  getSalesAnalytics,
};
