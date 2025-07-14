import axios from "./index";
import { API_BASE_URL } from "./index";
export const formatNumber = (num) => new Intl.NumberFormat().format(num);
export function toSignificantFigures(num, sigFigs = 2) {
  if (num === 0) return 0;

  // Handle very small numbers (scientific notation)
  if (Math.abs(num) < 1e-10) return 0;

  const digits = Math.floor(Math.log10(Math.abs(num))) + 1;
  const factor = Math.pow(10, sigFigs - digits);
  return Math.round(num * factor) / factor;
}

const processDailyData = (receipts) => {
  // First, aggregate the data with full precision
  const dailyData = receipts.reduce((acc, receipt) => {
    if (!receipt.createdAt || isNaN(new Date(receipt.createdAt).getTime())) {
      return acc; // Skip invalid dates
    }
    const date = new Date(receipt.createdAt);
    const dayKey = `${date.getDate()}-${
      date.getMonth() + 1
    }-${date.getFullYear()}`;

    if (!acc[dayKey]) {
      acc[dayKey] = {
        totalSales: 0,
        details: [],
        totalProfit: 0,
        // Store raw values for calculations
        rawSales: 0,
        rawProfit: 0,
      };
    }

    // Keep raw values for accurate calculations
    acc[dayKey].rawSales += receipt.total;
    acc[dayKey].rawProfit += receipt.profit;

    // Round only for display
    acc[dayKey].totalSales = Number(acc[dayKey].rawSales.toFixed(2));
    acc[dayKey].totalProfit = Number(acc[dayKey].rawProfit.toFixed(2));
    acc[dayKey].details.push(...receipt.detail);

    return acc;
  }, {});

  // Sort dates chronologically
  const sortedLabels = Object.keys(dailyData).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split("-").map(Number);
    const [dayB, monthB, yearB] = b.split("-").map(Number);
    const dateA = new Date(yearA, monthA - 1, dayA);
    const dateB = new Date(yearB, monthB - 1, dayB);
    return dateA - dateB;
  });

  // New function to convert onhand to best display unit
  function convertToDisplayUnit(onhand, unitConversions, baseUnit) {
    if (!unitConversions || unitConversions.length === 0) {
      return {
        value: toSignificantFigures(onhand, 3),
        unit: baseUnit || "units",
      };
    }

    // Find the smallest unit that gives a reasonable display value (>= 1)
    const sortedConversions = unitConversions
      .filter((conv) => conv.conversionRate > 0)
      .sort((a, b) => a.conversionRate - b.conversionRate);

    for (const conversion of sortedConversions) {
      const convertedValue = onhand * conversion.conversionRate;
      if (convertedValue >= 1) {
        return {
          value: toSignificantFigures(convertedValue, 3),
          unit: conversion.toUnit,
        };
      }
    }

    // If no suitable conversion found, use base unit
    return {
      value: toSignificantFigures(onhand, 3),
      unit: baseUnit || "units",
    };
  }

  // Create data arrays maintaining precision for calculations
  const salesData = sortedLabels.map((day) => ({
    date: day,
    value: dailyData[day].totalSales,
    // Include raw value for precise calculations if needed
    rawValue: dailyData[day].rawSales,
  }));

  const profitData = sortedLabels.map((day) => ({
    date: day,
    value: dailyData[day].totalProfit,
    // Include raw value for precise calculations if needed
    rawValue: dailyData[day].rawProfit,
  }));

  // Format dates for better display
  const formattedLabels = sortedLabels.map((day) => {
    const [d, m, y] = day.split("-");
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  });

  return {
    labels: formattedLabels,
    salesData: salesData.map((item) => item.value),
    profitData: profitData.map((item) => item.value),
    // Include raw data arrays if needed for additional calculations
    rawSalesData: salesData.map((item) => item.rawValue),
    rawProfitData: profitData.map((item) => item.rawValue),
  };
};

// Example usage:
const formatDataForChart = (processedData) => {
  return processedData.labels.map((label, index) => ({
    date: label,
    sales: processedData.salesData[index],
    profit: processedData.profitData[index],
  }));
};

export const validateFields = (newProduct, setErrors, noOnhand = true) => {
  let newErrors = {};
  if (!newProduct.name.trim()) newErrors.name = "Product Name is required";
  if (!newProduct.salesPrice || newProduct.salesPrice <= 0)
    newErrors.salesPrice = "Sales Price must be a positive number";
  if (!newProduct.costPrice || newProduct.costPrice <= 0)
    newErrors.costPrice = "Cost Price must be a positive number";
  if ((!newProduct.onhand || newProduct.onhand < 0) && noOnhand)
    newErrors.onhand = "Available Quantity must be at least 0";

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0; // Return true if no errors
};
const calculateTopProfitableProducts = (receipts) => {
  // Create a map to store product profits
  const productProfits = {};

  // Process each receipt
  receipts.forEach((receipt) => {
    receipt.detail.forEach((item) => {
      const productName = item.name;
      const profit = item.profit || 0;

      if (!productProfits[productName]) {
        productProfits[productName] = {
          name: productName,
          profit: 0,
          percentage: 0,
        };
      }

      productProfits[productName].profit += profit;
    });
  });

  // Convert to array and sort by profit
  const sortedProducts = Object.values(productProfits)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  // Calculate total profit for percentage
  const totalProfit = sortedProducts.reduce(
    (sum, product) => sum + product.profit,
    0
  );

  // Calculate percentage for each product
  return sortedProducts.map((product) => ({
    ...product,
    percentage: ((product.profit / totalProfit) * 100).toFixed(1),
  }));
};

const calculateTopCustomers = (receipts) => {
  // Create a map to store customer sales
  const customerSales = {};

  // Process each receipt
  receipts.forEach((receipt) => {
    // console.log(receipt)
    const customerId = receipt.customerId?.id;
    const customerName = receipt.customerId?.name || "Unknown Customer";
    const total = receipt.total || 0;

    if (!customerSales[customerId]) {
      customerSales[customerId] = {
        id: customerId,
        name: capitalizeFirstLetter(customerName),
        totalSales: 0,
        percentage: 0,
      };
    }

    customerSales[customerId].totalSales += total;
  });

  // Convert to array and sort by total sales
  const sortedCustomers = Object.values(customerSales)
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 10);

  // Calculate total sales for percentage
  const totalSales = sortedCustomers.reduce(
    (sum, customer) => sum + customer.totalSales,
    0
  );

  // Calculate percentage for each customer
  return sortedCustomers.map((customer) => ({
    ...customer,
    percentage: ((customer.totalSales / totalSales) * 100).toFixed(1),
  }));
};

const calculateTopPurchasedProducts = (receipts) => {
  // Accumulate the total quantity and profit of each product across all receipts
  const productCounts = receipts.reduce((acc, receipt) => {
    receipt.detail.forEach((item) => {
      if (!acc[item.name]) {
        acc[item.name] = { quantity: 0, profit: 0 };
      }
      const quantity = Math.abs(item.quantity);
      acc[item.name].quantity += quantity;
      acc[item.name].profit += Math.abs(
        (item.salesPrice - item.costPrice) * quantity
      );
    });
    return acc;
  }, {});

  // Convert the productCounts object to an array of [name, { quantity, profit }] pairs
  // and sort the array in descending order based on quantity and profit
  const sortedProductsQuantityBased = Object.entries(productCounts)
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 10);

  const sortedProductsProfitBased = Object.entries(productCounts)
    .sort((a, b) => b[1].profit - a[1].profit)
    .slice(0, 10);

  // Convert the sorted arrays back to an array of objects with name, quantity, and profit
  const topProductsByQuantity = sortedProductsQuantityBased.map(
    ([name, { quantity, profit }]) => ({
      name,
      quantity,
      profit,
    })
  );

  const topProductsByProfit = sortedProductsProfitBased.map(
    ([name, { quantity, profit }]) => ({
      name,
      quantity,
      profit,
    })
  );

  // Return both sorted data
  return {
    topProductsByQuantity,
    topProductsByProfit,
  };
};

export const calculateSalesMetrics = (receipts) => {
  const hourlyData = new Array(24).fill(0).map(() => ({
    sales: 0,
    transactions: 0,
    averageTicket: 0,
  }));

  const weekdayData = new Array(7).fill(0).map(() => ({
    sales: 0,
    transactions: 0,
    averageTicket: 0,
  }));

  receipts.forEach((receipt) => {
    if (!receipt.createdAt || isNaN(new Date(receipt.createdAt).getTime())) {
      return; // Skip invalid dates
    }
    const date = new Date(receipt.createdAt);
    const hour = date.getHours();
    const weekday = date.getDay();

    // Update hourly metrics
    hourlyData[hour].sales += receipt.total;
    hourlyData[hour].transactions += 1;
    hourlyData[hour].averageTicket =
      hourlyData[hour].sales / hourlyData[hour].transactions;

    // Update weekday metrics
    weekdayData[weekday].sales += receipt.total;
    weekdayData[weekday].transactions += 1;
    weekdayData[weekday].averageTicket =
      weekdayData[weekday].sales / weekdayData[weekday].transactions;
  });

  return {
    hourlyAnalytics: hourlyData.map((data, hour) => ({
      hour,
      ...data,
    })),
    weekdayAnalytics: weekdayData.map((data, day) => ({
      day,
      ...data,
    })),
  };
};

export const calculatePaymentMetrics = (receipts) => {
  const paymentMethods = receipts.reduce((acc, receipt) => {
    const method = receipt.paymentMethod || "unknown";
    if (!acc[method]) {
      acc[method] = {
        total: 0,
        count: 0,
        average: 0,
      };
    }
    acc[method].total += receipt.total;
    acc[method].count += 1;
    acc[method].average = acc[method].total / acc[method].count;
    return acc;
  }, {});

  return Object.entries(paymentMethods).map(([method, data]) => ({
    method,
    ...data,
  }));
};

export const tableActions = {
  calculateInventoryMetrics: (inventory) => {
    return {
      lowStock: inventory.filter(
        (item) => item.onhand <= (item.reorderPoint || 10)
      ),
      outOfStock: inventory.filter((item) => item.onhand === 0),
      totalValue: inventory.reduce(
        (sum, item) => sum + item.onhand * item.costPrice,
        0
      ),
      turnoverRate: calculateInventoryTurnover(inventory),
    };
  },

  calculateSalesMetrics: (receipts) => {
    const hourlyData = new Array(24).fill(0).map(() => ({
      sales: 0,
      transactions: 0,
      averageTicket: 0,
    }));

    const weekdayData = new Array(7).fill(0).map(() => ({
      sales: 0,
      transactions: 0,
      averageTicket: 0,
    }));

    receipts.forEach((receipt) => {
      if (!receipt.createdAt || isNaN(new Date(receipt.createdAt).getTime())) {
        return; // Skip invalid dates
      }
      const date = new Date(receipt.createdAt);
      const hour = date.getHours();
      const weekday = date.getDay();

      // Update hourly metrics
      hourlyData[hour].sales += receipt.total;
      hourlyData[hour].transactions += 1;
      hourlyData[hour].averageTicket =
        hourlyData[hour].sales / hourlyData[hour].transactions;

      // Update weekday metrics
      weekdayData[weekday].sales += receipt.total;
      weekdayData[weekday].transactions += 1;
      weekdayData[weekday].averageTicket =
        weekdayData[weekday].sales / weekdayData[weekday].transactions;
    });

    return {
      hourlyAnalytics: hourlyData.map((data, hour) => ({
        hour,
        ...data,
      })),
      weekdayAnalytics: weekdayData.map((data, day) => ({
        day,
        ...data,
      })),
    };
  },

  calculatePaymentMetrics: (receipts) => {
    const paymentMethods = receipts.reduce((acc, receipt) => {
      const method = receipt.paymentMethod || "unknown";
      if (!acc[method]) {
        acc[method] = {
          total: 0,
          count: 0,
          average: 0,
        };
      }
      acc[method].total += receipt.total;
      acc[method].count += 1;
      acc[method].average = acc[method].total / acc[method].count;
      return acc;
    }, {});

    return Object.entries(paymentMethods).map(([method, data]) => ({
      method,
      ...data,
    }));
  },

  // Add to tableActions object
  fetchSalesAnalytics: async (companyId) => {
    try {
      const receiptsResponse = await axios.get(
        `/api/receipts/overall/${companyId}`
      );
      const receipts = receiptsResponse.data;
      console.log(receipts);

      const salesMetrics = calculateSalesMetrics(receipts);
      const paymentMetrics = calculatePaymentMetrics(receipts);
      console.log(salesMetrics);

      return {
        ...salesMetrics,
        paymentMethods: paymentMetrics,
      };
    } catch (error) {
      console.error("Error fetching sales analytics:", error);
      throw new Error("Failed to fetch sales analytics");
    }
  },

  fetchInventoryMetrics: async (companyId) => {
    try {
      const response = await axios.get(`/api/products/${companyId}`);
      const inventory = response.data.products;

      return calculateInventoryMetrics(inventory);
    } catch (error) {
      console.error("Error fetching inventory metrics:", error);
      throw new Error("Failed to fetch inventory metrics");
    }
  },

  fetchCustomers: async (companyId) => {
    try {
      const response = await axios.get(`/api/customers/${companyId}`);
      const data = response.data.customers.map((item, index) => ({
        id: item.id,
        index: index + 1,
        company: item.company ? item.company : "None",
        name: item.name,
        phone:
          Array.isArray(item.phone) &&
          item.phone.length > 0 &&
          item.phone[0] !== ""
            ? item.phone[0] // Show only the first phone number
            : item.phone || null,
        //     email: Array.isArray(item.email) && item.email.length > 0 && item.email[0] !== ""
        // ? item.email[0]  // Show only the first email
        // : item.email || null,
      }));

      return data;
    } catch (error) {
      throw new Error("Failed to fetch customers");
    }
  },
  fetchCustomersNames: async (companyId) => {
    try {
      const response = await axios.get(`/api/customers/${companyId}`);
      const data = response.data.customers.map((item) =>
        capitalizeFirstLetter(`${item?.company || "None"} - ${item?.name}`)
      );
      return data;
    } catch (error) {
      throw new Error("Failed to fetch customers");
    }
  },

  fetchCustomerDiscounts: async (customerId) => {
    try {
      const response = await axios.get(`/api/customers/${customerId}/discounts`);
      return response.data;
    } catch (error) {
      console.error("Error fetching customer discounts:", error);
      throw new Error("Failed to fetch customer discounts");
    }
  },

  fetchProducts: async (companyId) => {
    try {
      const response = await axios.get(`/api/products/${companyId}`);
      const data = response.data.products.map((item, index) => ({
        id: item.id,
        index: index + 1,
        name: item.name,
        costPrice: item.costPrice,
        salesPrice: item.salesPrice,
        onhand: toSignificantFigures(item.onhand, 2),
      }));
      // const page = response.page
      return data;
    } catch (error) {
      console.log(error);
      throw new Error("Failed to fetch products");
    }
  },
  fetchProductNames: async (companyId) => {
    try {
      const response = await axios.get(`/api/products/${companyId}`);
      const data = response.data.products.map((item) => ({
        id: item.id,
        name: item.name,
        conversions: item.unitConversions || [],
        baseUnit: item.baseUnit,
        salesPrice: item.salesPrice,
        onhand: item.onhand,
      }));
      return data;
    } catch (error) {
      throw new Error(error);
    }
  },

  updateCustomer: async ({ id, name, phone, email, address, company }) => {
    try {
      console.log(id);
      const customer = await axios.patch(`/api/customers/${id}`, {
        id,
        name,
        phone,
        email,
        address,
        company,
      });
      if (customer.status === 200) {
        return null;
      }
    } catch (error) {
      console.log(error);
      return error.response?.data?.message || "An error occured";
    }
  },
  updateCompanyData: async ({ companyId, ...details }) => {
    try {
      // empty fileds in the settings forms do not change the prev values
      // Prepare the payload by filtering out empty values
      const updateFields = {};
      for (const [key, value] of Object.entries(details)) {
        if (value !== undefined && value !== null && value !== "") {
          updateFields[key] = value;
        }
      }

      const submissionData = { companyId, ...updateFields };
      // Send the PATCH request to update the company details
      const response = await axios.patch(
        `/api/companies/update/${companyId}`,
        submissionData
      );

      // Check if the update was successful
      if (response.status === 200) {
        return response.data; // Return the updated company data
      }
    } catch (error) {
      console.log(error);
      // return error.response?.data?.message || "An error occurred";
      throw new Error(error.response?.data?.message || "Ann error occured");
    }
  },

  addCustomer: async ({ companyId, name, phone, email, address, company }) => {
    try {
      const response = await axios.post(`/api/customers/`, {
        belongsTo: companyId,
        name,
        phone,
        email,
        address,
        company,
      });

      if (response.status === 201) {
        return response.data;
      }
    } catch (error) {
      // Check if it's a known error response from our API
      console.log(error);
      return error.response.data.message; // Throw the specific error message
    }
  },

  updateProduct: async ({
    id,
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
  }) => {
    try {
      const response = await axios.patch(`/api/products/${id}`, {
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
        unitConversions: unitConversions || [],
      });
      if (response.status === 200) {
        return null; // Success, no error
      }
    } catch (error) {
      console.error(error);
      return error.response?.data?.message || "An error occurred";
    }
  },

  addProduct: async ({
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
  }) => {
    try {
      const response = await axios.post(`/api/products/`, {
        companyId,
        name,
        category,
        baseUnit,
        costPrice,
        salesPrice,
        onhand: onhand || 0,
        reorderPoint,
        minimumStock,
        description,
        sku,
        barcode,
        unitConversions: unitConversions || [],
      });
      if (response.status === 201) {
        return response.data.data; // Return the product data
      }
    } catch (error) {
      return error.response?.data?.message || "An error occurred";
    }
  },
  addWorker: async ({ companyId, name, username, contact, password, role, email }) => {
    try {
      const smallName = name.toLowerCase();
      const response = await axios.post(`/api/workers`, {
        companyId,
        name: smallName,
        username,
        contact,
        password,
        role,
        email,
      });

      if (response.status === 201) {
        // Return the data from the response
        return response.data;
      } else {
        // Handle unexpected status codes
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      console.error(error.response?.data?.message);
      // Throw the error so the calling function can handle it
      throw error?.response?.data?.message;
    }
  },

  addReceipt: async (values, companyId, workerId, checkDebt) => {
    try {
      const response = await axios.post("/api/receipts/add/", {
        ...values,
        companyId,
        workerId,
        checkDebt,
      });
      if (response.status === 200 || response.status === 201) {
        // Successful response
        return response.data; // You can return any data you receive from the server
      } else {
        // Handle unexpected status codes
        console.error("Unexpected status code:", response.status);
        return "Unexpected status code";
      }
    } catch (error) {
      // Handle errors
      console.error("Error:", error);
      throw new Error(error.response?.data?.message || "An error occurred");
    }
  },
  updateReceipt: async (receiptId, values, companyId, workerId) => {
    try {
      const response = await axios.patch(
        `/api/receipts/${receiptId}`, // Ensure this endpoint is correct
        {
          ...values, // Include the updated values
          companyId, // Add company ID to the request
          workerId, // Add worker ID to the request
        }
      );

      if (response.status === 200) {
        console.log("Receipt updated successfully");
        return response.data;
      } else {
        console.error("Failed to update the receipt");
      }
    } catch (error) {
      console.error("Failed to update the receipt:", error.message);
      throw error;
    }
  },
  addVendor: async (values, companyId) => {
    try {
      const response = await axios.post("/api/vendor/", {
        ...values,
        companyId: companyId,
      });

      if (response.status === 200 || response.status === 201) {
        // Successful response
        return response.data; // You can return any data you receive from the server
      } else {
        // Handle unexpected status codes
        console.error("Unexpected status code:", response.status);
        return "Unexpected status code";
      }
    } catch (error) {
      // Handle errors
      console.error("Error:", error);
      return error.response?.data?.message || "An error occurred";
    }
  },

  fetchReceipts: async (companyId, selectedDate) => {
    try {
      const response = await axios.get(
        `/api/receipts/${companyId}?date=${selectedDate}`
      );
      // const todaysReceipts = serverAid.filterReceiptsForToday(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching receipts:", error);
      throw error;
    }
  },
  fetchReceiptsById: async ({ receiptId }) => {
    try {
      const response = await axios.get(`/api/receipts/receipt/${receiptId}`);
      const data = response.data;
      
      // Transform the data to match ReceiptDialog expectations
      return {
        customerName: data.customer?.name || 'Unknown Customer',
        workerName: data.worker?.name || 'Unknown Worker',
        date: data.date,
        detail: data.details || [],
        discount: data.discount || 0,
        total: data.total,
        amountPaid: data.amountPaid || 0,
        balance: data.balance || 0
      };
    } catch (error) {
      throw error;
    }
  },
  fetchPaymentsById: async ({ debtId }) => {
    try {
      const response = await axios.get(`/api/debt/debt/${debtId}/payments`);
      const data = response.data;
      
      // Transform the data to match PaymentDisplayDialog expectations
      // Backend returns { payments: [...] }, but component expects array directly
      // Also transform id to _id for compatibility
      const payments = (data.payments || []).map(payment => ({
        ...payment,
        _id: payment.id
      }));
      
      return payments;
    } catch (error) {
      console.error("Error fetching payments:", error);
      throw error;
    }
  },
  fetchDebt: async (companyId, selectedDate, selectedDuration) => {
    try {
      let url = `/api/debts/${companyId}?`;

      if (selectedDate) {
        const formattedDate = selectedDate.toISOString().split("T")[0];
        url += `date=${formattedDate}&`;
        console.log(formattedDate);
      }

      if (selectedDuration) {
        url += `duration=${selectedDuration}`;
      }

      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching debts:", error);
      throw error;
    }
  },
  fetchWorkers: async (companyId) => {
    try {
      const response = await axios.get(`api/workers/${companyId}`);
      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      throw new Error("Failed to Fetch Workers");
    }
  },
  fetchCounts: async (companyId) => {
    try {
      const response = await axios.get(`/api/companies/counts/${companyId}`);
      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      throw new Error(error.response.data.message || "Failed to fetch counts");
    }
  },
  fetchSuppliersNames: async (companyId) => {
    try {
      const response = await axios.get(`api/vendors/${companyId}`);
      if (response.status === 200) {
        return response.data?.map((data) =>
          capitalizeFirstLetter(
            `${data?.name || "None"} - ${data?.contact_person}`
          )
        );
      }
    } catch (error) {
      throw new Error(error.response.data.message || "Failed to fetch counts");
    }
  },
  fetchSuppliers: async (companyId) => {
    try {
      const response = await axios.get(`api/vendors/${companyId}`);
      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      throw new Error(error.response.data.message || "Failed to fetch vendors");
    }
  },
  addSupplier: async ({ companyId, companyName, supplierName, contact }) => {
    try {
      const response = await axios.post(`/api/vendors/${companyId}`, {
        companyId,
        companyName,
        supplierName,
        contact,
      });

      if (response.status === 201) {
        // Return the data from the response
        return response.data; // use data, not message
      } else {
        // Handle unexpected status codes
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      console.error(error.response.data);
      // Throw the error so the calling function can handle it
      throw error?.response?.data?.message || "Failed to add supplier";
    }
  },
  fetchSupplierDetails: async (vendorId, companyId) => {
    try {
      const response = await axios.get(`api/vendors/${companyId}/${vendorId}`);
      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch vendor details");
    }
  },
  fetchSuppliesByVendor: async (vendorId, companyId) => {
    try {
      const response = await axios.get(`api/supplies/${companyId}`);
      if (response.status === 200) {
        // Filter supplies by vendor ID
        return response.data.filter(supply => supply.supplierId === parseInt(vendorId));
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch vendor supplies");
    }
  },

  fetchSupplyDetails: async (supplyId, companyId) => {
    try {
      const response = await axios.get(`api/supplies/${companyId}/${supplyId}`);
      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch supply details");
    }
  },

  deleteVendor: async (vendorId) => {
    try {
      const response = await axios.delete(`/api/vendors/${vendorId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to delete vendor");
    }
  },
  restock: async (values, companyId) => {
    try {
      const response = await axios.post(`/api/supplies/${companyId}`, {
        ...values,
        companyId: companyId,
      });
      if (response.status === 200 || response.status === 201) {
        // Successful response
        return response.data;
      } else {
        // Handle unexpected status codes
        console.error("Unexpected status code:", response.status);
        return "Unexpected status code";
      }
    } catch (error) {
      // Handle errors
      console.error("Error:", error);
      throw new Error(error.response?.data?.message || "An error occurred");
    }
  },
  fetchSalesData: async (companyId, dateRange) => {
    try {
      const params = {};
      if (dateRange) {
        params.dateRange = JSON.stringify(dateRange);
      }

      const response = await axios.get(`/api/receipts/overall/${companyId}`, {
        params,
        headers: {
          "Content-Type": "application/json",
        },
      });
      // Backend now returns array directly instead of {receipts: []}
      const receipts = Array.isArray(response.data)
        ? response.data
        : response.data.receipts || [];

      const { labels, salesData, profitData } = processDailyData(receipts);
      const { topProductsByProfit, topProductsByQuantity } =
        calculateTopPurchasedProducts(receipts);

      // Add new analytics
      const topProfitableProducts = calculateTopProfitableProducts(receipts);
      const topCustomers = calculateTopCustomers(receipts);

      const sales = labels.map((label, index) => ({
        month: label,
        totalSales: salesData[index],
      }));

      const profit = labels.map((label, index) => ({
        month: label,
        totalProfit: profitData[index],
      }));

      return {
        sales,
        profit,
        topProductsByQuantity,
        topProductsByProfit,
        topProfitableProducts,
        topCustomers,
      };
    } catch (error) {
      console.error("Error fetching sales data", error);
      throw new Error("Failed to fetch sales data");
    }
  },
};

export const capitalizeFirstLetter = (str) => {
  if (typeof str === "string") {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return str;
};

export const serverAid = {
  calculateTopPurchasedProducts: (receipts) => {
    // Accumulate the total quantity and profit of each product across all receipts
    const productCounts = receipts.reduce((acc, receipt) => {
      receipt.detail.forEach((item) => {
        if (!acc[item.name]) {
          acc[item.name] = { quantity: 0, profit: 0 };
        }
        const quantity = Math.abs(item.quantity);
        acc[item.name].quantity += quantity;
        acc[item.name].profit += Math.abs(
          (item.salesPrice - item.costPrice) * quantity
        );
      });
      return acc;
    }, {});

    // Convert the productCounts object to an array of [name, { quantity, profit }] pairs
    // and sort the array in descending order based on quantity and profit
    const sortedProductsQuantityBased = Object.entries(productCounts)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 10);

    const sortedProductsProfitBased = Object.entries(productCounts)
      .sort((a, b) => b[1].profit - a[1].profit)
      .slice(0, 10);

    // Convert the sorted arrays back to an array of objects with name, quantity, and profit
    const topProductsByQuantity = sortedProductsQuantityBased.map(
      ([name, { quantity, profit }]) => ({
        name,
        quantity,
        profit,
      })
    );

    const topProductsByProfit = sortedProductsProfitBased.map(
      ([name, { quantity, profit }]) => ({
        name,
        quantity,
        profit,
      })
    );

    // Return both sorted data
    return {
      topProductsByQuantity,
      topProductsByProfit,
    };
  },
};

export const updateAccount = async (data) => {
  try {
    const response = await axios.put(`/api/workers/${data.id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating account:", error); // Log the error
    throw error;
  }
};

export const fetchReportData = async (companyId, reportType, filters) => {
  const { startDate, endDate } = filters;

  let endpoint;

  switch (reportType) {
    case "summary":
      endpoint = `/api/reports/summary?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`;
      break;
    case "sales":
      endpoint = `/api/reports/sales?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`;
      break;
    case "summary":
      endpoint = `/api/reports/summary?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`;
      break;
    case "purchases":
      endpoint = `/api/reports/purchases?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`;
      break;
    case "inventory":
      endpoint = `/api/reports/inventory?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`;
      break;
    case "debts":
      endpoint = `/api/reports/debts?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`;
      break;
    default:
      throw new Error("Invalid report type");
  }

  const response = await axios.get(endpoint);
  return response.data;
};

export const getNextDayDate = () => {
  const today = new Date();
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + 1);
  return nextDay.toISOString().split("T")[0];
};

export const updateOnhandAfterSale = (
  productOptions,
  values,
  allowBelowZero = true
) => {
  values.products.forEach((soldItem) => {
    const productToUpdate = productOptions.find(
      (product) => product.name === soldItem.name
    );
    if (productToUpdate) {
      productToUpdate.onhand -= soldItem.quantity;
    }

    // if (productToUpdate.onhand < 0 && allowBelowZero) {
    //   productToUpdate.onhand = 0;
    // }
  });
  return productOptions;
};
export const updateValuesAfterRestock = (products, values) => {
  values.products.forEach((receivedItem) => {
    const productToUpdate = products.find(
      (product) => product.name === receivedItem.name
    );
    if (productToUpdate) {
      productToUpdate.onhand += receivedItem.quantity;
      productToUpdate.costPrice = receivedItem.costPrice;
      productToUpdate.salesPrice = receivedItem.salesPrice;
    }
  });
  return products;
};
export const updateValuesAfterEdit = (Data, values) => {
  const productToUpdate = Data.find((product) => product.id === values.id);
  console.log(productToUpdate);
  if (productToUpdate) {
    productToUpdate.name = values.name;
    productToUpdate.costPrice = values.costPrice;
    productToUpdate.salesPrice = values.salesPrice;
  }

  return Data;
};

// Fetch category analytics
export const fetchCategoryAnalytics = async (companyId, dateRange) => {
  try {
    const params = {};
    if (dateRange) {
      params.dateRange = JSON.stringify(dateRange);
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/companies/analytics/categories/${companyId}`,
      {
        params,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching category analytics:", error);
    throw error;
  }
};

// Fetch payment method analytics
export const fetchPaymentAnalytics = async (companyId, dateRange) => {
  try {
    const params = {};
    if (dateRange) {
      params.dateRange = JSON.stringify(dateRange);
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/companies/analytics/payments/${companyId}`,
      {
        params,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching payment analytics:", error);
    throw error;
  }
};

// Fetch hourly sales analytics
export const fetchHourlyAnalytics = async (companyId, dateRange) => {
  try {
    const params = {};
    if (dateRange) {
      params.dateRange = JSON.stringify(dateRange);
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/companies/analytics/hourly/${companyId}`,
      {
        params,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching hourly analytics:", error);
    throw error;
  }
};

// Fetch inventory alerts
export const fetchInventoryAlerts = async (companyId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/companies/analytics/inventory/${companyId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching inventory alerts:", error);
    throw error;
  }
};

// Fetch weekday analytics
export const fetchWeekdayAnalytics = async (companyId, dateRange) => {
  try {
    const params = {};
    if (dateRange) {
      params.dateRange = JSON.stringify(dateRange);
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/companies/analytics/weekday/${companyId}`,
      {
        params,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching weekday analytics:", error);
    throw error;
  }
};

export const calculateSalesAnalytics = (receipts) => {
  const hourlyData = {};
  const weekdayData = {};

  receipts.forEach((receipt) => {
    const date = new Date(receipt.createdAt);
    const hour = date.getHours();
    const weekday = date.getDay();

    // Hourly sales
    if (!hourlyData[hour]) {
      hourlyData[hour] = { sales: 0, transactions: 0 };
    }
    hourlyData[hour].sales += receipt.total;
    hourlyData[hour].transactions += 1;

    // Weekday sales
    if (!weekdayData[weekday]) {
      weekdayData[weekday] = { sales: 0, transactions: 0 };
    }
    weekdayData[weekday].sales += receipt.total;
    weekdayData[weekday].transactions += 1;
  });

  return {
    hourlyAnalytics: Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      sales: data.sales,
      transactions: data.transactions,
      averageTicket: data.sales / data.transactions,
    })),
    weekdayAnalytics: Object.entries(weekdayData).map(([day, data]) => ({
      day: parseInt(day),
      sales: data.sales,
      transactions: data.transactions,
      averageTicket: data.sales / data.transactions,
    })),
  };
};

// Calculate inventory turnover rate
export const calculateInventoryTurnover = (inventory) => {
  if (!inventory || inventory.length === 0) return 0;

  // Calculate total inventory value
  const totalInventoryValue = inventory.reduce((sum, item) => {
    return sum + item.onhand * item.costPrice;
  }, 0);

  // If no inventory value, return 0
  if (totalInventoryValue === 0) return 0;

  // Calculate average monthly sales (assuming 30 days sales cycle)
  // This is a simplified calculation - in real scenarios you'd use actual COGS data
  const averageMonthlySales = inventory.reduce((sum, item) => {
    // Estimate monthly sales based on current stock and reorder point
    const estimatedMonthlySales = Math.max(
      0,
      (item.reorderPoint || 0) * item.costPrice
    );
    return sum + estimatedMonthlySales;
  }, 0);

  // Calculate turnover rate (times per year)
  const annualTurnover = (averageMonthlySales * 12) / totalInventoryValue;
  return Math.round(annualTurnover * 100) / 100; // Round to 2 decimal places
};

export const calculateInventoryMetrics = (inventory) => {
  return {
    lowStock: inventory.filter((item) => item.onhand <= item.reorderPoint),
    outOfStock: inventory.filter((item) => item.onhand === 0),
    totalValue: inventory.reduce(
      (sum, item) => sum + item.onhand * item.costPrice,
      0
    ),
    averageTurnover: calculateInventoryTurnover(inventory),
  };
};

export const calculateCashFlow = (receipts) => {
  const cashFlow = receipts.reduce((acc, receipt) => {
    const date = new Date(receipt.createdAt).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = {
        cash: 0,
        card: 0,
        momo: 0,
        total: 0,
      };
    }

    switch (receipt.paymentMethod) {
      case "cash":
        acc[date].cash += receipt.total;
        break;
      case "card":
        acc[date].card += receipt.total;
        break;
      case "momo":
        acc[date].momo += receipt.total;
        break;
    }
    acc[date].total += receipt.total;
    return acc;
  }, {});

  return Object.entries(cashFlow).map(([date, data]) => ({
    date,
    ...data,
  }));
};

updateAccount: async (data) => {
  try {
    const response = await axios.put(`/api/workers/${data.id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating account:", error); // Log the error
    throw error;
  }
};

fetchReportData: async (companyId, reportType, filters) => {
  const { startDate, endDate } = filters;

  let endpoint;

  switch (reportType) {
    case "summary":
      endpoint = `/api/reports/summary?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`;
      break;
    case "sales":
      endpoint = `/api/reports/sales?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`;
      break;
    case "purchases":
      endpoint = `/api/reports/purchases?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`;
      break;
    case "inventory":
      endpoint = `/api/reports/inventory?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`;
      break;
    case "debts":
      endpoint = `/api/reports/debts?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`;
      break;
    default:
      throw new Error("Invalid report type");
  }

  const response = await axios.get(endpoint);
  return response.data;
};

getNextDayDate: () => {
  const today = new Date();
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + 1);
  return nextDay.toISOString().split("T")[0];
};

updateOnhandAfterSale: (productOptions, values, allowBelowZero = true) => {
  values.products.forEach((soldItem) => {
    const productToUpdate = productOptions.find(
      (product) => product.name === soldItem.name
    );
    if (productToUpdate) {
      productToUpdate.onhand -= soldItem.quantity;
    }

    // if (productToUpdate.onhand < 0 && allowBelowZero) {
    //   productToUpdate.onhand = 0;
    // }
  });
  return productOptions;
};
updateValuesAfterRestock: (products, values) => {
  values.products.forEach((receivedItem) => {
    const productToUpdate = products.find(
      (product) => product.name === receivedItem.name
    );
    if (productToUpdate) {
      productToUpdate.onhand += receivedItem.quantity;
      productToUpdate.costPrice = receivedItem.costPrice;
      productToUpdate.salesPrice = receivedItem.salesPrice;
    }
  });
  return products;
};
updateValuesAfterEdit: (Data, values) => {
  const productToUpdate = Data.find((product) => product.id === values.id);
  console.log(productToUpdate);
  if (productToUpdate) {
    productToUpdate.name = values.name;
    productToUpdate.costPrice = values.costPrice;
    productToUpdate.salesPrice = values.salesPrice;
  }

  return Data;
};
