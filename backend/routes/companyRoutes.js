const express = require("express");
const router = express.Router();
const db = require("../data/db/supabase-db");

// Get Counts
const countData = async (req, res) => {
  try {
    const companyId = req.params.companyId;

    // Helper function to get count from PostgreSQL table
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
    res.json(row);
  });
});

// Create a new company
router.post("/", (req, res) => {
  const { name, address, phone, email } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Company name is required" });
  }

  db.run(
    "INSERT INTO Company (name, address, phone, email) VALUES (?, ?, ?, ?)",
    [name, address, phone, email],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Update company data
const updateCompanyDetails = async (req, res) => {
  try {
    const { company } = req.params;
    const updates = req.body;

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
            db.run(
              "INSERT INTO CompanyAllowedUnits (companyId, unit) VALUES (?, ?)",
              [company, unit],
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
            db.run(
              "INSERT INTO CompanyAllowedCategories (companyId, category) VALUES (?, ?)",
              [company, category],
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
            db.run(
              "INSERT INTO CompanyAllowedUnits (companyId, unit) VALUES (?, ?)",
              [company, unit],
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
            db.run(
              "INSERT INTO CompanyAllowedCategories (companyId, category) VALUES (?, ?)",
              [company, category],
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
