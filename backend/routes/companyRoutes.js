const express = require("express");
const router = express.Router();
const db = require("../data/db/db");
const dbUtils = require("../utils/dbUtils");
const EventService = require("../services/eventService");
const bcrypt = require('bcrypt');
const { CLOSING } = require("ws");

// Get Counts
const countData = async (req, res) => {
  try {
    const companyId = req.params.companyId;

    // Helper function to get count from SQLite table
    const getCount = (tableName, whereClause = "companyId = ?") => {
      return new Promise((resolve, reject) => {
        db.get(
          `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`,
          [companyId],
          (err, row) => {
            if (err) {
              reject(err);
            } else {
              resolve(row.count);
            }
          }
        );
      });
    };

    // Get counts for all tables in parallel
    const [productCount, customerCount, salesCount, userCount] =
      await Promise.all([
        getCount("Inventory", "companyId = ? AND deleted = 0"), // Only count non-deleted inventory
        getCount("Customer", "belongsTo = ?"), // Customer table uses belongsTo for company reference
        getCount("Receipt", "companyId = ? AND (flagged IS NULL OR flagged = 0)"), // Receipt count for sales (non-flagged only)
        getCount("Worker", "companyId = ?"), // Worker count for users
      ]);

    res.json({
      productCount,
      customerCount,
      salesCount,
      userCount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching counts", error: error.message });
  }
};
router.get("/counts/:companyId", countData);

// Get category analytics
const getCategoryAnalytics = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { dateRange } = req.query;

    let dateFilter = "";
    let params = [companyId];

    if (dateRange) {
      const parsedDateRange = JSON.parse(dateRange);
      if (parsedDateRange.type === "month") {
        const [year, month] = parsedDateRange.month.split("-");
        const startDate = `${year}-${month.padStart(2, "0")}-01`;
        const endDate = new Date(year, month, 0).toISOString().split("T")[0];
        dateFilter = "AND r.createdAt >= ? AND r.createdAt <= ?";
        params.push(startDate, endDate + " 23:59:59");
      } else if (parsedDateRange.type === "custom") {
        dateFilter = "AND r.createdAt >= ? AND r.createdAt <= ?";
        params.push(
          parsedDateRange.startDate,
          parsedDateRange.endDate + " 23:59:59"
        );
      }
    }

    const categoryQuery = `
      SELECT 
        CASE 
          WHEN i.category = 'none' OR i.category IS NULL THEN 'Uncategorized'
          ELSE i.category
        END as category,
        COUNT(rd.id) as totalSales,
        SUM(rd.quantity) as totalQuantity,
        SUM(rd.salesPrice * rd.quantity) as totalRevenue,
        SUM((rd.salesPrice - rd.costPrice) * rd.quantity) as totalProfit,
        AVG(rd.salesPrice) as avgPrice,
        COUNT(DISTINCT r.id) as transactionCount
      FROM ReceiptDetail rd
      JOIN Receipt r ON rd.receiptId = r.id
      JOIN Inventory i ON rd.name = i.name AND i.companyId = r.companyId
      WHERE r.companyId = ? AND (r.flagged IS NULL OR r.flagged = 0) ${dateFilter}
      GROUP BY 
        CASE 
          WHEN i.category = 'none' OR i.category IS NULL THEN 'Uncategorized'
          ELSE i.category
        END
      ORDER BY totalRevenue DESC
    `;

    db.all(categoryQuery, params, (err, rows) => {
      if (err) {
        console.error("Error in category analytics:", err);
        return res.status(500).json({ error: err.message });
      }

      const totalRevenue = rows.reduce((sum, row) => sum + row.totalRevenue, 0);
      const categoryAnalytics = rows.map((row) => ({
        ...row,
        percentage:
          totalRevenue > 0
            ? ((row.totalRevenue / totalRevenue) * 100).toFixed(1)
            : 0,
      }));

      res.json(categoryAnalytics);
    });
  } catch (error) {
    console.error("Error in category analytics:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get payment method analytics
const getPaymentAnalytics = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { dateRange } = req.query;

    let dateFilter = "";
    let params = [companyId];

    if (dateRange) {
      const parsedDateRange = JSON.parse(dateRange);
      if (parsedDateRange.type === "month") {
        const [year, month] = parsedDateRange.month.split("-");
        const startDate = `${year}-${month.padStart(2, "0")}-01`;
        const endDate = new Date(year, month, 0).toISOString().split("T")[0];
        dateFilter = "AND createdAt >= ? AND createdAt <= ?";
        params.push(startDate, endDate + " 23:59:59");
      } else if (parsedDateRange.type === "custom") {
        dateFilter = "AND createdAt >= ? AND createdAt <= ?";
        params.push(
          parsedDateRange.startDate,
          parsedDateRange.endDate + " 23:59:59"
        );
      }
    }

    const paymentQuery = `
      SELECT 
        paymentMethod,
        COUNT(*) as transactionCount,
        SUM(total) as totalAmount,
        AVG(total) as avgTransactionValue
      FROM Receipt 
      WHERE companyId = ? AND (flagged IS NULL OR flagged = 0) ${dateFilter}
      GROUP BY paymentMethod
      ORDER BY totalAmount DESC
    `;

    db.all(paymentQuery, params, (err, rows) => {
      if (err) {
        console.error("Error in payment analytics:", err);
        return res.status(500).json({ error: err.message });
      }

      const totalAmount = rows.reduce((sum, row) => sum + row.totalAmount, 0);
      const paymentAnalytics = rows.map((row) => ({
        ...row,
        percentage:
          totalAmount > 0
            ? ((row.totalAmount / totalAmount) * 100).toFixed(1)
            : 0,
      }));

      res.json(paymentAnalytics);
    });
  } catch (error) {
    console.error("Error in payment analytics:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get hourly sales analytics
const getHourlyAnalytics = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { dateRange } = req.query;

    let dateFilter = "";
    let params = [companyId];

    if (dateRange) {
      const parsedDateRange = JSON.parse(dateRange);
      if (parsedDateRange.type === "month") {
        const [year, month] = parsedDateRange.month.split("-");
        const startDate = `${year}-${month.padStart(2, "0")}-01`;
        const endDate = new Date(year, month, 0).toISOString().split("T")[0];
        dateFilter = "AND createdAt >= ? AND createdAt <= ?";
        params.push(startDate, endDate + " 23:59:59");
      } else if (parsedDateRange.type === "custom") {
        dateFilter = "AND createdAt >= ? AND createdAt <= ?";
        params.push(
          parsedDateRange.startDate,
          parsedDateRange.endDate + " 23:59:59"
        );
      }
    }

    const hourlyQuery = `
      SELECT 
        CAST(strftime('%H', createdAt) AS INTEGER) as hour,
        COUNT(*) as transactions,
        SUM(total) as sales,
        AVG(total) as avgTicket
      FROM Receipt 
      WHERE companyId = ? AND (flagged IS NULL OR flagged = 0) ${dateFilter}
      GROUP BY hour
      ORDER BY hour
    `;

    db.all(hourlyQuery, params, (err, rows) => {
      if (err) {
        console.error("Error in hourly analytics:", err);
        return res.status(500).json({ error: err.message });
      }

      // Fill in missing hours with zero values
      const hourlyData = Array.from({ length: 24 }, (_, i) => {
        const existingData = rows.find((row) => row.hour === i);
        return (
          existingData || {
            hour: i,
            transactions: 0,
            sales: 0,
            avgTicket: 0,
          }
        );
      });

      res.json(hourlyData);
    });
  } catch (error) {
    console.error("Error in hourly analytics:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get inventory alerts
const getInventoryAlerts = async (req, res) => {
  try {
    const { companyId } = req.params;

    const alertsQuery = `
      SELECT 
        id,
        name,
        category,
        onhand,
        reorderPoint,
        minimumStock,
        salesPrice,
        costPrice,
        (onhand * costPrice) as inventoryValue
      FROM Inventory 
      WHERE companyId = ? AND deleted = 0
      ORDER BY 
        CASE 
          WHEN onhand <= 0 THEN 1
          WHEN onhand <= reorderPoint THEN 2
          WHEN onhand <= minimumStock THEN 3
          ELSE 4
        END,
        onhand ASC
    `;

    db.all(alertsQuery, [companyId], (err, rows) => {
      if (err) {
        console.error("Error in inventory alerts:", err);
        return res.status(500).json({ error: err.message });
      }

      // Transform data to include alertType for frontend
      const alertsWithType = rows.map((item) => {
        let alertType = "normal";
        if (item.onhand <= 0) {
          alertType = "out_of_stock";
        } else if (item.onhand <= item.reorderPoint) {
          alertType = "low_stock";
        } else if (item.onhand <= item.minimumStock) {
          alertType = "critical_stock";
        }

        return {
          ...item,
          alertType,
        };
      });

      // Filter to only return items that need attention
      const alertItems = alertsWithType.filter(
        (item) =>
          item.alertType === "out_of_stock" ||
          item.alertType === "low_stock" ||
          item.alertType === "critical_stock"
      );

      res.json(alertItems);
    });
  } catch (error) {
    console.error("Error in inventory alerts:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get weekday analytics
const getWeekdayAnalytics = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { dateRange } = req.query;

    let dateFilter = "";
    let params = [companyId];

    if (dateRange) {
      const parsedDateRange = JSON.parse(dateRange);
      if (parsedDateRange.type === "month") {
        const [year, month] = parsedDateRange.month.split("-");
        const startDate = `${year}-${month.padStart(2, "0")}-01`;
        const endDate = new Date(year, month, 0).toISOString().split("T")[0];
        dateFilter = "AND createdAt >= ? AND createdAt <= ?";
        params.push(startDate, endDate + " 23:59:59");
      } else if (parsedDateRange.type === "custom") {
        dateFilter = "AND createdAt >= ? AND createdAt <= ?";
        params.push(
          parsedDateRange.startDate,
          parsedDateRange.endDate + " 23:59:59"
        );
      }
    }

    const weekdayQuery = `
      SELECT 
        CASE CAST(strftime('%w', createdAt) AS INTEGER)
          WHEN 0 THEN 'Sunday'
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day,
        COUNT(*) as transactions,
        SUM(total) as sales,
        AVG(total) as averageTicket
      FROM Receipt 
      WHERE companyId = ? AND (flagged IS NULL OR flagged = 0) ${dateFilter}
      GROUP BY strftime('%w', createdAt)
      ORDER BY strftime('%w', createdAt)
    `;

    db.all(weekdayQuery, params, (err, rows) => {
      if (err) {
        console.error("Error in weekday analytics:", err);
        return res.status(500).json({ error: err.message });
      }

      res.json(rows);
    });
  } catch (error) {
    console.error("Error in weekday analytics:", error);
    res.status(500).json({ error: error.message });
  }
};

router.get("/analytics/categories/:companyId", getCategoryAnalytics);
router.get("/analytics/payments/:companyId", getPaymentAnalytics);
router.get("/analytics/hourly/:companyId", getHourlyAnalytics);
router.get("/analytics/inventory/:companyId", getInventoryAlerts);
router.get("/analytics/weekday/:companyId", getWeekdayAnalytics);
// Get all companies
router.get("/", (req, res) => {
  console.log("Fetching all companies");
  db.all("SELECT * FROM Company", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get a single company
router.get("/:id", (req, res) => {
  db.get("SELECT * FROM Company WHERE id = ?", [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Fetch allowedUnits
    db.all(
      "SELECT unit FROM CompanyAllowedUnits WHERE companyId = ?",
      [req.params.id],
      (err, units) => {
        if (err) {
          console.error("Error fetching units:", err);
          // Don't fail the whole request, just return empty array
        }

        const allowedUnits = units ? units.map((u) => u.unit) : [];

        // Fetch allowedCategories
        db.all(
          "SELECT category FROM CompanyAllowedCategories WHERE companyId = ?",
          [req.params.id],
          (err, categories) => {
            if (err) {
              console.error("Error fetching categories:", err);
            }

            const allowedCategories = categories
              ? categories.map((c) => c.category)
              : [];

            res.json({
              ...row,
              allowedUnits,
              allowedCategories,
            });
          }
        );
      }
    );
  });
});

// Create a new company
router.post("/", async (req, res) => {
  const { name, address, phone, email, password, parentCompanyId } = req.body;
  console.table(req.body);

  if (!name) {
    return res.status(400).json({ error: "Company name is required" });
  }

  try {
    // Check if company name already exists
    const existingCompany = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, companyName FROM Company WHERE companyName = ?",
        [name],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingCompany) {
      return res.status(409).json({ 
        error: "Company name already exists",
        message: `A company with the name "${name}" already exists. Please choose a different name.`
      });
    }

    const pwd = password || 'password123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(pwd, salt);

    const newCompanyId = dbUtils.generateUUID();
    db.run(
      "INSERT INTO Company (id, companyName, storeAddress, contact, email, password, parentCompanyId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [newCompanyId, name, address, phone, email, hashedPassword, parentCompanyId || null],
      function (err) {
        if (err) {
          // Handle other database errors
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ 
              error: "Duplicate entry",
              message: "A company with this name or email already exists."
            });
          }
          return res.status(500).json({ error: err.message });
        }
        
        // If parentCompanyId is provided, also add to CompanyNetwork
        if (parentCompanyId) {
          const networkId = dbUtils.generateUUID();
          db.run(
            "INSERT INTO CompanyNetwork (id, sourceCompanyId, targetCompanyId, relationshipType, status) VALUES (?, ?, ?, 'subsidiary', 'active')",
            [networkId, newCompanyId, parentCompanyId],
            (err) => {
              if (err) console.error('Failed to link to parent in CompanyNetwork:', err);
            }
          );
        }
        
        // Emit Event
        EventService.emit(newCompanyId, 'COMPANY_CREATED', {
          id: newCompanyId,
          name, address, phone, email, parentCompanyId
        });

        res.status(201).json({ id: newCompanyId });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update company data
const updateCompanyDetails = async (req, res) => {
  try {
    const { company } = req.params;
    const updates = req.body;
    console.table(req.body)

    // Handle allowedUnits and allowedCategories separately
    const { allowedUnits, allowedCategories, ...otherUpdates } = updates;

    const allowedFields = [
      "companyName",
      "email",
      "password",
      "isEmailVerified",
      "emailVerificationToken",
      "emailVerificationExpires",
      "passwordResetToken",
      "passwordResetExpires",
      "refreshToken",
      "contact",
      "location",
      "taxRate",
      "currencyCode",
      "currentPlan",
      "emailNotifications",
      "momo",
      "nextBillingDate",
      "paymentMethod",
      "paymentProvider",
      "smsNotifications",
      "storeAddress",
      "taxId",
      "tinNumber",
      "receiptTemplate",
      "receiptHeader",
      "receiptFooter",
      "taxMode",
      "parentCompanyId",
      "taxIdType",
      "preventOverselling",
    ];

    // Filter updates to only include allowed fields (excluding allowedUnits/allowedCategories)
    const filteredUpdates = {};
    Object.keys(otherUpdates).forEach((key) => {
      if (allowedFields.includes(key)) {
        let value = otherUpdates[key];
        
        // Sanitize value for SQLite
        if (value === undefined) {
          value = null;
        } else if (typeof value === 'boolean') {
          // Convert boolean to integer (0 or 1) for SQLite
          value = value ? 1 : 0;
        } else if (typeof value === 'object' && value !== null && !Buffer.isBuffer(value)) {
          // If it's an object (and not null/buffer), try to stringify it
          // This handles cases where frontend might send an object for a text field
          try {
            value = JSON.stringify(value);
          } catch (e) {
            console.warn(`Could not stringify value for ${key}:`, e);
            value = String(value);
          }
        }
        
        filteredUpdates[key] = value;
      }
    });
    console.table(filteredUpdates)

    // Update main Company table if there are valid fields
    if (Object.keys(filteredUpdates).length > 0) {
      const setClause = Object.keys(filteredUpdates)
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = [...Object.values(filteredUpdates), company];

      const sql = `
        UPDATE Company 
        SET ${setClause}, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;

      console.log('SQL:', sql);
      console.log('Values:', values);
      console.log('Values types:', values.map((v, i) => `[${i}] ${typeof v}: ${v}`));


      await new Promise((resolve, reject) => {
        db.run(sql, values, function (err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Handle allowedUnits if provided
    if (allowedUnits !== undefined) {
      // Delete existing units
      await new Promise((resolve, reject) => {
        db.run(
          "DELETE FROM CompanyAllowedUnits WHERE companyId = ?",
          [company],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Insert new units
      if (allowedUnits.length > 0) {
        const insertPromises = allowedUnits.map((unit) => {
          return new Promise((resolve, reject) => {
            const unitId = dbUtils.generateUUID();
            db.run(
              "INSERT INTO CompanyAllowedUnits (id, companyId, unit) VALUES (?, ?, ?)",
              [unitId, company, unit],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });
        await Promise.all(insertPromises);
      }
    }

    // Handle allowedCategories if provided
    if (allowedCategories !== undefined) {
      // Delete existing categories
      await new Promise((resolve, reject) => {
        db.run(
          "DELETE FROM CompanyAllowedCategories WHERE companyId = ?",
          [company],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Insert new categories
      if (allowedCategories.length > 0) {
        const insertPromises = allowedCategories.map((category) => {
          return new Promise((resolve, reject) => {
            const catId = dbUtils.generateUUID();
            db.run(
              "INSERT INTO CompanyAllowedCategories (id, companyId, category) VALUES (?, ?, ?)",
              [catId, company, category],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });
        await Promise.all(insertPromises);
      }
    }

    // Fetch and return the updated company with allowedUnits and allowedCategories
    db.get(
      "SELECT * FROM Company WHERE id = ?",
      [company],
      (err, companyRow) => {
        if (err) {
          console.error("Fetch company error:", err);
          return res
            .status(500)
            .json({ message: "Database error", error: err.message });
        }

        if (!companyRow) {
          return res.status(404).json({ message: "Company not found" });
        }

        // Fetch allowedUnits
        db.all(
          "SELECT unit FROM CompanyAllowedUnits WHERE companyId = ?",
          [company],
          (err, units) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            const allowedUnits = units.map((row) => row.unit);

            // Fetch allowedCategories
            db.all(
              "SELECT category FROM CompanyAllowedCategories WHERE companyId = ?",
              [company],
              (err, categories) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }

                const allowedCategories = categories.map((row) => row.category);

                // Remove sensitive fields from response
                const {
                  password,
                  emailVerificationToken,
                  passwordResetToken,
                  refreshToken,
                  ...safeCompany
                } = companyRow;

                // Emit Event
                EventService.emit(company, 'COMPANY_UPDATED', {
                  id: company,
                  updates: filteredUpdates,
                  allowedUnits: allowedUnits !== undefined ? allowedUnits : undefined,
                  allowedCategories: allowedCategories !== undefined ? allowedCategories : undefined
                });

                res.status(200).json({
                  ...safeCompany,
                  allowedUnits,
                  allowedCategories,
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error("Update company error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

router.patch("/update/:company", updateCompanyDetails);

// Delete a company
router.delete("/:id", (req, res) => {
  db.run("DELETE FROM Company WHERE id = ?", [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json({ deleted: true });
  });
});

// Network Management Endpoints

// Get Network Connections
router.get("/:id/network", (req, res) => {
  const companyId = req.params.id;
  const query = `
    SELECT 
      cn.id as linkId,
      cn.relationshipType,
      cn.status,
      c.id as partnerId,
      c.companyName as partnerName,
      c.taxId as partnerTaxId,
      'outgoing' as direction
    FROM CompanyNetwork cn
    JOIN Company c ON cn.targetCompanyId = c.id
    WHERE cn.sourceCompanyId = ?
    UNION
    SELECT 
      cn.id as linkId,
      cn.relationshipType,
      cn.status,
      c.id as partnerId,
      c.companyName as partnerName,
      c.taxId as partnerTaxId,
      'incoming' as direction
    FROM CompanyNetwork cn
    JOIN Company c ON cn.sourceCompanyId = c.id
    WHERE cn.targetCompanyId = ?
  `;

  db.all(query, [companyId, companyId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add Network Connection
router.post("/:id/network", (req, res) => {
  const sourceCompanyId = req.params.id;
  const { targetCompanyId, relationshipType } = req.body;

  if (!targetCompanyId || !relationshipType) {
    return res.status(400).json({ error: "Target Company ID and Relationship Type are required" });
  }

  const networkId = dbUtils.generateUUID();
  const sql = `
    INSERT INTO CompanyNetwork (id, sourceCompanyId, targetCompanyId, relationshipType, status)
    VALUES (?, ?, ?, ?, 'active')
  `;

  db.run(sql, [networkId, sourceCompanyId, targetCompanyId, relationshipType], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: "Relationship already exists" });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: networkId, message: "Network connection created" });
  });
});

// Remove Network Connection
router.delete("/:id/network/:partnerId", (req, res) => {
  const companyId = req.params.id;
  const partnerId = req.params.partnerId;

  const sql = `
    DELETE FROM CompanyNetwork 
    WHERE (sourceCompanyId = ? AND targetCompanyId = ?) 
       OR (sourceCompanyId = ? AND targetCompanyId = ?)
  `;

  db.run(sql, [companyId, partnerId, partnerId, companyId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Network connection removed", changes: this.changes });
  });
});

module.exports = router;

// Around line 95-140, modify the update company endpoint
router.put("/update/:id", async (req, res) => {
  try {
    const company = req.params.id;
    const updates = req.body;

    // Handle allowedUnits and allowedCategories separately
    const { allowedUnits, allowedCategories, ...otherUpdates } = updates;

    // Build dynamic SQL update query for main Company table
    const allowedFields = [
      "companyName",
      "email",
      "password",
      "isEmailVerified",
      "emailVerificationToken",
      "emailVerificationExpires",
      "passwordResetToken",
      "passwordResetExpires",
      "refreshToken",
      "contact",
      "location",
      "taxRate",
      "currency",
      "currentPlan",
      "emailNotifications",
      "momo",
      "nextBillingDate",
      "paymentMethod",
      "paymentProvider",
      "smsNotifications",
      "storeAddress",
      "taxId",
      "tinNumber",
      "receiptTemplate",
      "receiptHeader",
      "receiptFooter",
      "taxMode",
      "parentCompanyId",
      "taxIdType",
    ];

    // Filter updates to only include allowed fields (excluding allowedUnits/allowedCategories)
    const filteredUpdates = {};
    Object.keys(otherUpdates).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = otherUpdates[key];
      }
    });

    // Update main Company table if there are valid fields
    if (Object.keys(filteredUpdates).length > 0) {
      const setClause = Object.keys(filteredUpdates)
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = [...Object.values(filteredUpdates), company];

      const sql = `
        UPDATE Company 
        SET ${setClause}, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;

      await new Promise((resolve, reject) => {
        db.run(sql, values, function (err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Handle allowedUnits if provided
    if (allowedUnits !== undefined) {
      // Delete existing units
      await new Promise((resolve, reject) => {
        db.run(
          "DELETE FROM CompanyAllowedUnits WHERE companyId = ?",
          [company],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Insert new units
      if (allowedUnits.length > 0) {
        const insertPromises = allowedUnits.map((unit) => {
          return new Promise((resolve, reject) => {
            const unitId = dbUtils.generateUUID();
            db.run(
              "INSERT INTO CompanyAllowedUnits (id, companyId, unit) VALUES (?, ?, ?)",
              [unitId, company, unit],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });
        await Promise.all(insertPromises);
      }
    }

    // Handle allowedCategories if provided
    if (allowedCategories !== undefined) {
      // Delete existing categories
      await new Promise((resolve, reject) => {
        db.run(
          "DELETE FROM CompanyAllowedCategories WHERE companyId = ?",
          [company],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Insert new categories
      if (allowedCategories.length > 0) {
        const insertPromises = allowedCategories.map((category) => {
          return new Promise((resolve, reject) => {
            const catId = dbUtils.generateUUID();
            db.run(
              "INSERT INTO CompanyAllowedCategories (id, companyId, category) VALUES (?, ?, ?)",
              [catId, company, category],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });
        await Promise.all(insertPromises);
      }
    }

    // Fetch and return the updated company with allowedUnits and allowedCategories
    db.get(
      "SELECT * FROM Company WHERE id = ?",
      [company],
      (err, companyRow) => {
        if (err) {
          console.error("Fetch company error:", err);
          return res
            .status(500)
            .json({ message: "Database error", error: err.message });
        }

        // Fetch allowedUnits
        db.all(
          "SELECT unit FROM CompanyAllowedUnits WHERE companyId = ?",
          [company],
          (err, units) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            const allowedUnits = units.map((row) => row.unit);

            // Fetch allowedCategories
            db.all(
              "SELECT category FROM CompanyAllowedCategories WHERE companyId = ?",
              [company],
              (err, categories) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }

                const allowedCategories = categories.map((row) => row.category);

                res.json({
                  message: "Company updated successfully",
                  company: {
                    ...companyRow,
                    allowedUnits,
                    allowedCategories,
                  },
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error("Update company error:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
});
