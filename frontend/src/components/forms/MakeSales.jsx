import { useState, useRef, useEffect } from "react";
import { Formik, Field, FieldArray, Form } from "formik";
import {
  Button,
  TextField,
  Typography,
  Snackbar,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import ErrorAlert from "../../utils/Error";
import { Autocomplete } from "@mui/material";
import * as Yup from "yup";
import {
  capitalizeFirstLetter,
  tableActions,
  updateOnhandAfterSale,
} from "../../config/Functions";
import { validateFields } from "../../config/Functions";
import { useSelector } from "react-redux";
import useMediaQuery from "@mui/material/useMediaQuery";
import ReceiptTemplate from "../compPrint/ReceiptTemplate";
import { useLocation } from "react-router-dom";
import Loader from "../common/Loader";
import { motion } from "framer-motion";

const validationSchema = Yup.object().shape({
  customerName: Yup.string().required("Customer name is required"),
  total: Yup.number().required(),
  amountPaid: Yup.number().required("Amount Paid should not be empty"),
  discount: Yup.number().min(0, "Discount cannot be negative"),
  paymentMethod: Yup.string().required("Payment method is required"),
});

const MakeSales = ({
  customers,
  Products,
  handleCustomerUpdate,
  handleProductUpdate,
  editData,
}) => {
  const checkDebt = true;
  const location = useLocation();
  const { row } = location.state || {};
  const worker = useSelector((state) => state.userState.currentUser);
  const workerId = worker.id;
  const company = useSelector((state) => state.companyState.data);
  const companyId = company.id;
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [detailError, setDetailErrors] = useState({});
  const [owesDebt, setOwesDebt] = useState(false);
  const [open, setOpen] = useState(false);
  const [print, setPrint] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const matchesMobile = useMediaQuery("(max-width:600px)");
  const matchesTablet = useMediaQuery("(max-width:900px)");
  const [loading, setLoading] = useState(false);
  const printRef = useRef();
  const [printValues, setPrintValues] = useState(null);
  const today = new Date().toLocaleDateString();
  const [customerError, setCustomerError] = useState("");
  const [submittingForm, setSubmittingForm] = useState(false);

  const [customerOptions, setCustomerOptions] = useState([
    "<<<< Add New Customer >>>>",
    ...customers
      .sort()
      .filter((options) => options !== "<<<< Add New Customer >>>>"),
  ]);

  // Update customer options when customers prop changes
  useEffect(() => {
    setCustomerOptions([
      "<<<< Add New Customer >>>>",
      ...customers
        .sort()
        .filter((options) => options !== "<<<< Add New Customer >>>>"),
    ]);
  }, [customers]);
  const [productOptions, setProductOptions] = useState([
    {
      id: 1,
      name: "<<<< Add New Product >>>>",
    },

    ...Products?.sort((a, b) => a.name?.localeCompare(b.name))
  ]);

  // Update product options when Products prop changes
  useEffect(() => {
    setProductOptions([
      {
        id: 1,
        name: "<<<< Add New Product >>>>",
      },
      ...Products?.sort((a, b) => a.name?.localeCompare(b.name)).filter(
        (option) => option !== "<<<< Add New Product >>>>"
      ),
    ]);
  }, [Products]);

  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false);
  const [newProductDialogOpen, setNewProductDialogOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerCompany, setNewCustomerCompany] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    salesPrice: "",
    costPrice: "",
    onhand: "",
    baseUnit: "none",
    allowsUnitBreakdown: false,
    atomicUnit: "none",
    conversionFactor: 1,
    potentialLoss: 0,
  });

  const getInitialValues = () => {
    // Default empty form values with unit field added
    return {
      customerName: "",
      products: [
        { name: "", quantity: "", unit: "none", totalPrice: 0, price: 0 },
      ],
      total: 0,
      amountPaid: "",
      discount: 0,
      paymentMethod: "cash",
    };
  };

  const validateReceiptDetail = (values) => {
    let detailErrors = {};

    const details = values.products;

    if (details) {
      details.forEach((detail, index) => {
        if (!detail.name) {
          detailErrors[`products.${index}.product`] = `Product ${
            index + 1
          }'s name is required`;
        }
        if (!detail.quantity) {
          detailErrors[`products.${index}.quantity`] = `Product ${
            index + 1
          }'s quantity is required`;
        }
        if (!detail.price) {
          detailErrors[`products.${index}.price`] = `Product ${
            index + 1
          }'s price is required`;
        }
        // if (!detail.unit) {
        //   detailErrors[`products.${index}.unit`] = `Product ${
        //     index + 1
        //   }'s unit is required`;
        // }
      });
    }

    setDetailErrors(detailErrors);
    return detailErrors;
  };

  const handleSubmit = async (values, setSubmitting, resetForm) => {
    // Calculate total price
    const total = values.products.reduce(
      (sum, product) => sum + (product?.totalPrice || 0),
      0
    );
    values.total = total; // Maintain total before discount
    const balance = values.total - values.amountPaid - values.discount;

    try {
      // Validate product details
      const errors = validateReceiptDetail(values);
      if (Object.keys(errors).length > 0) {
        setError("Please fill in all required fields correctly.");
        return; // Stop execution if validation fails
      }

      // Validate customer name
      if (!values.customerName?.trim()) {
        setError("Customer Name should not be empty");
        return;
      }

      // Validate amount paid
      if (values.amountPaid === undefined || values.amountPaid === "") {
        setError("Amount Paid should not be empty!");
        return;
      }

      setLoading(true);
      setSubmitting(true);

      // Call API to add receipt and check for debt
      const results = await tableActions.addReceipt(
        { ...values, balance },
        companyId,
        workerId,
        checkDebt
      );

      // Handle existing debt scenario
      if (results.existingDebt) {
        setOwesDebt(true);
        setModalMessage(
          `Customer has an existing debt of ${results.existingDebt.amount}.`
        );
        setOpen(true);
      } else {
        setModalMessage("Receipt added successfully!");
        setOpen(true);
      }

      // Update inventory onhand after sale
      const newData = updateOnhandAfterSale(productOptions, values);
      setProductOptions(newData);

      // Store values for printing, if applicable
      if (print) {
        setPrintValues({ ...values, balance });
      }

      // Reset form after a short delay
      setTimeout(() => {
        resetForm();
      }, 1000);
    } catch (error) {
      setError(error.message || "An error occurred");
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  const handleNewCustomerSubmit = async () => {
    try {
      setSubmittingForm(true);
      setCustomerError(""); // Reset error state

      // Input validation
      if (!newCustomerName.trim()) {
        setCustomerError("Customer name is required");
        setSubmittingForm(false);
        return;
      }

      const formattedName = newCustomerName.trim().toLowerCase();

      // Create customer object with company
      const customerData = {
        name: formattedName,
        company: newCustomerCompany.trim(),
        companyId,
      };

      // Make the API call
      const response = await tableActions.addCustomer(customerData);

      // Validate API response
      if (!response || typeof response !== "object") {
        const errorMessage = typeof response === 'string' ? response : 'Failed to add customer';
        setError(errorMessage);
        setSubmittingForm(false);
        return;
      }

      // Format the display name only after confirming we have valid data
      let displayName;
      if (response && newCustomerCompany.trim()) {
        displayName = `${capitalizeFirstLetter(
          newCustomerCompany
        )} - ${capitalizeFirstLetter(formattedName)}`;
      } else {
        displayName = `Nocompany - ${capitalizeFirstLetter(formattedName)}`;// Remove the "None -" prefix
      }

      // Update customer options only if we have a valid displayName
      if (displayName && displayName.trim()) {
        // Update customer options
        setCustomerOptions((prevOptions) => {
          const filteredOptions = prevOptions.filter(
            (option) =>
              option !== "<<<< Add New Customer >>>>" && option !== displayName // Remove any existing entry for this customer
          );
          return [
            "<<<< Add New Customer >>>>",
            displayName,
            ...filteredOptions,
          ];
        });

        // Update parent component's customer list if handler exists
        if (handleCustomerUpdate) {
          handleCustomerUpdate((prevOptions) => {
            const filteredOptions = prevOptions.filter(
              (option) =>
                option !== "<<<< Add New Customer >>>>" && option !== displayName
            );
            return [displayName, ...filteredOptions];
          });
        }

        // Reset form and close dialog
        setSubmittingForm(false);
        setNewCustomerDialogOpen(false);
        setNewCustomerName("");
        setNewCustomerCompany("");
        setCustomerError("");
      } else {
        // Even if displayName formatting fails, customer was created successfully
        // So we should still close the dialog and reset the form
        console.warn("Customer created but display name formatting failed:", response);
        setSubmittingForm(false);
        setNewCustomerDialogOpen(false);
        setNewCustomerName("");
        setNewCustomerCompany("");
        setCustomerError("");
      }
    } catch (error) {
      setSubmittingForm(false);
      if (error.response) {
        setError(error.response.message || "Failed to add new customer");
      }
      <ErrorAlert error={error} onClose={() => setError(null)} />;
      console.error("Error adding new customer:", error);
      setSubmittingForm(false);
      setCustomerError(error.message || "Failed to add new customer");
      // Don't close the dialog when there's an error
    }
  };

  const handleNewProductSubmit = async () => {
    try {
      if (!validateFields(newProduct, setErrors)) return; // Validate the input fields
      setSubmittingForm(true);
      // Ensure the product name is properly formatted
      const formattedProductName = newProduct.name.trim().toLowerCase();

      // Send request to add product
      const data = await tableActions.addProduct({
        ...newProduct,
        name: formattedProductName,
        companyId,
      });


      if (!data) {
        const errorMessage = typeof data === 'string' ? data : (data?.message || 'Failed to add product');
        throw new Error(errorMessage);
      }

      const addedProduct = data;
      const acceptedProduct = {
        id: addedProduct.id,
        name: addedProduct.name,
        salesPrice: addedProduct.salesPrice || 0,
        onhand: addedProduct.onhand || 0,
        baseUnit: addedProduct.defaultUnit || "none",
      };

      // Update product options properly
      setProductOptions((prevOptions) => {
        const filteredOptions = prevOptions.filter(
          (option) => option.name !== "<<<< Add New Product >>>>"
        );
        return [
          { id: 1, name: "<<<< Add New Product >>>>" },
          acceptedProduct,
          ...filteredOptions,
        ];
      });

      // productOptions.slice(1,0,acceptedProduct)

      // Update parent component's product list if handler exists
      if (handleProductUpdate) {
        handleProductUpdate((prevOptions) => {
          const filteredOptions = prevOptions.filter(
            (option) => option.name !== "<<<< Add New Product >>>>"
          );
          return [
            acceptedProduct,
            ...filteredOptions,
          ];
        });
      }

      // Close dialog and reset form
      setNewProductDialogOpen(false);
      setSubmittingForm(false);
      setNewProduct({
        name: "",
        salesPrice: "",
        costPrice: "",
        onhand: "",
        baseUnit: "none",
        allowsUnitBreakdown: false,
        atomicUnit: "none",
        conversionFactor: 1,
        potentialLoss: 0,
      });
    } catch (error) {
      setSubmittingForm(false);
      setError(error.message || "Failed to add new product");
    }
  };

  // handle new product creation
  // Handle input change for new product
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getProductUnits = (productName) => {
    if (!productName) return ["none"];

    const product = productOptions.find(
      (p) => p.name.toLowerCase() === productName.toLowerCase()
    );
    if (!product) return ["none"];

    // Start with base unit
    const availableUnits = [product.baseUnit];

    // If product allows unit breakdown, add atomic unit
    if (
      product.allowsUnitBreakdown &&
      product.atomicUnit !== product.baseUnit
    ) {
      availableUnits.push(product.atomicUnit);
    }

    // Add converted units if they exist
    if (product.conversions && product.conversions.length > 0) {
      product.conversions.forEach((conv) => {
        if (!availableUnits.includes(conv.toUnit)) {
          availableUnits.push(conv.toUnit);
        }
      });
    }

    return availableUnits;
  };

  const calculateQuantityInAtomicUnits = (quantity, unit, product) => {
    if (!product || !quantity || isNaN(quantity)) return 0;
    
    // If unit is "none" or undefined, use the unit with the greatest conversion rate
    if (!unit || unit === "none") {
      // Find the unit with the highest conversion factor
      let maxConversionRate = 1;
      let bestUnit = product.atomicUnit || product.baseUnit;
      
      // Check base unit conversion
      if (product.conversionFactor && product.conversionFactor > maxConversionRate) {
        maxConversionRate = product.conversionFactor;
        bestUnit = product.baseUnit;
      }
      
      // Check other conversions
      if (product.conversions) {
        product.conversions.forEach(conv => {
          if (conv.factor && conv.factor > maxConversionRate) {
            maxConversionRate = conv.factor;
            bestUnit = conv.toUnit;
          }
        });
      }
      
      // Use the best unit for conversion
      unit = bestUnit;
    }

    // If using atomic unit, no conversion needed
    if (unit === product.atomicUnit) return quantity;

    // If using base unit, convert to atomic units
    if (unit === product.baseUnit && product.conversionFactor) {
      return quantity * product.conversionFactor;
    }

    // For other units, find the conversion
    const conversion = product.conversions?.find(
      (conv) => conv.toUnit === unit
    );
    if (conversion && conversion.factor) {
      return quantity * conversion.factor;
    }

    // Fallback: return quantity as-is if no conversion found
    return quantity;
  };

  const calculateQuantityInDisplayUnit = (atomicQuantity, unit, product) => {
    if (!product || unit === "none") return atomicQuantity;

    // If using atomic unit, no conversion needed
    if (unit === product.atomicUnit) return atomicQuantity;

    // If using base unit, convert from atomic units
    if (unit === product.baseUnit) {
      return atomicQuantity / product.conversionFactor;
    }

    // For other units, find the conversion
    const conversion = product.conversions?.find(
      (conv) => conv.toUnit === unit
    );
    if (conversion) {
      return atomicQuantity / conversion.factor;
    }

    return atomicQuantity;
  };

  const getUnitPrice = (productName, unit) => {
    const product = productOptions.find(
      (p) => p.name.toLowerCase() === productName.toLowerCase()
    );
    if (!product) return 0;

     // If it's the base unit, return the base sales price
    if (unit === product.baseUnit) {
      return product.salesPrice;
    }


    // Find the conversion for this unit
    const conversion = product.conversions?.find(
      (conv) => conv.toUnit === unit
    );
    if (conversion) {
      return conversion.salesPrice;
    }

    return product.salesPrice;
  };

  // Add function to suggest best input unit
  function suggestInputUnit(product) {
    if (!product.unitConversions || product.unitConversions.length === 0) {
      return product.baseUnit || "units";
    }

    // Find unit that makes onhand closest to a whole number
    let bestUnit = product.baseUnit;
    let bestScore = Math.abs(product.onhand - Math.round(product.onhand));

    for (const conversion of product.unitConversions) {
      const convertedOnhand = product.onhand * conversion.conversionRate;
      const score = Math.abs(convertedOnhand - Math.round(convertedOnhand));
      if (score < bestScore) {
        bestScore = score;
        bestUnit = conversion.toUnit;
      }
    }

    return bestUnit;
  }

  const validateQuantity = (value) => {
    if (value === "") return true; // Allow empty field
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue >= 0;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="page">
      <div
        className="heading"
        style={{ background: "none", marginBottom: "2rem" }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 500,
            color: "#333",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}>
          <i
            className="bx bx-cart-add"
            style={{ fontSize: "2rem", color: "#2196f3" }}></i>
          Make Sales
        </Typography>
      </div>

      <Formik
        initialValues={getInitialValues()}
        validationSchema={validationSchema}
        onSubmit={(values, { setSubmitting, resetForm }) => {
          handleSubmit(values, setSubmitting, resetForm);
        }}>
        {({ values, submitForm, setFieldValue, isSubmitting, resetForm }) => (
          <Form
            className="form"
            style={{
              margin: "1rem",
              padding: "2rem",
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            }}>
            <Field name="customerName">
              {({ field, form }) => {
                const hasError = Boolean(
                  form.errors.customerName && form.touched.customerName
                );
                return (
                  <Autocomplete
                    {...field}
                    autoHighlight
                    options={capitalizeFirstLetter(customerOptions)}
                    value={field.value}
                    onChange={(event, newValue) => {
                      if (newValue === "<<<< Add New Customer >>>>") {
                        setNewCustomerDialogOpen(true);
                        form.setFieldValue(field.name, "");
                      } else {
                        form.setFieldValue(field.name, newValue || "");
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        style={{ marginBottom: "1.5rem" }}
                        label="Customer Name"
                        fullWidth
                        error={hasError}
                        helperText={hasError ? form.errors.customerName : ""}
                        variant="outlined"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px",
                          },
                          "& .MuiInputLabel-root": {
                            color: "#666",
                          },
                        }}
                      />
                    )}
                  />
                );
              }}
            </Field>

            <div
              style={{
                height: "2px",
                background: "linear-gradient(90deg, #2196f3, #f50057)",
                marginBottom: "2rem",
                borderRadius: "2px",
              }}
            />

            <FieldArray name="products">
              {({ push, remove }) => (
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    flexDirection: "column",
                  }}>
                  {values.products?.map((product, index) => {
                    const productItems = productOptions.map(
                      (p) => p?.name || ""
                    );
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        style={{
                          display: "flex",
                          flex: 1,
                          gap: "1rem",
                          flexWrap: "wrap",
                          flexDirection: matchesMobile ? "column" : "row",
                          padding: "1.5rem",
                          background: "#f8f9fa",
                          borderRadius: "12px",
                          marginBottom: "1rem",
                          border: "1px solid #e0e0e0",
                        }}>
                        {/* Product name field */}
                        <div style={{ width: "100%" }}>
                          <Field name={`products.${index}.name`}>
                            {({ field, form }) => (
                              <Autocomplete
                                autoHighlight
                                options={productItems}
                                value={
                                  product.name
                                    ? capitalizeFirstLetter(product.name)
                                    : ""
                                }
                                onChange={(event, newValue) => {
                                  if (
                                    newValue === "<<<< Add New Product >>>>"
                                  ) {
                                    setNewProductDialogOpen(true);
                                    form.setFieldValue(field.name, "");
                                  } else {
                                    form.setFieldValue(
                                      field.name,
                                      newValue || ""
                                    );
                                    if (newValue) {
                                      const selectedProduct =
                                        productOptions.find(
                                          (p) => p.name === newValue
                                        );
                                      if (selectedProduct) {
                                        setFieldValue(
                                          `products.${index}.unit`,
                                          selectedProduct.baseUnit
                                        );
                                        const newTotalPrice =
                                          product.quantity *
                                          selectedProduct.salesPrice;
                                        setFieldValue(
                                          `products.${index}.totalPrice`,
                                          Math.ceil(newTotalPrice)
                                        );
                                        setFieldValue(
                                          `products.${index}.price`,
                                          selectedProduct.salesPrice || 0
                                        );
                                      }
                                    }
                                  }
                                }}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Product Name"
                                    fullWidth
                                    error={
                                      !!detailError?.[
                                        `products.${index}.product`
                                      ]
                                    }
                                    helperText={
                                      detailError?.[
                                        `products.${index}.product`
                                      ] || ""
                                    }
                                    variant="outlined"
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: "8px",
                                      },
                                      "& .MuiInputLabel-root": {
                                        color: "#666",
                                      },
                                    }}
                                  />
                                )}
                              />
                            )}
                          </Field>
                        </div>

                        {/* Quick quantity selector */}
                        {product.name && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.5rem",
                              alignItems: "center",
                            }}>
                            <Typography variant="caption" color="textSecondary">
                              Available Units:
                            </Typography>
                            {getProductUnits(product.name).map((unit) => (
                              <Button
                                key={unit}
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{
                                  minWidth: "36px",
                                  height: "28px",
                                  padding: "0 8px",
                                }}
                                onClick={() => {
                                  setFieldValue(`products.${index}.unit`, unit);
                                  const newPrice = getUnitPrice(
                                    product.name,
                                    unit
                                  );
                                  setFieldValue(
                                    `products.${index}.price`,
                                    newPrice
                                  );
                                  const newTotalPrice = Math.ceil(
                                    product.quantity * newPrice
                                  );
                                  setFieldValue(
                                    `products.${index}.totalPrice`,
                                    newTotalPrice
                                  );
                                }}>
                                {unit}
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* Quantity and unit row */}
                        <div
                          style={{
                            display: "flex",
                            gap: "0.8rem",
                            flexWrap: "wrap",
                            alignItems: "flex-start",
                          }}>
                          {/* Quantity with unit selector */}
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              flex: matchesMobile ? "1 1 100%" : "2",
                              minWidth: matchesMobile ? "100%" : "200px",
                            }}>
                            <Field name={`products.${index}.quantity`}>
                              {({ field, form }) => {
                                const selectedProduct = productOptions.find(
                                  (p) => p.name === product.name
                                );
                                const currentUnit =
                                  product.unit ||
                                  selectedProduct?.baseUnit ||
                                  "none";

                                return (
                                  <TextField
                                    {...field}
                                    label="Quantity"
                                    type="number"
                                    step="any"
                                    error={
                                      !!detailError?.[
                                        `products.${index}.quantity`
                                      ]
                                    }
                                    helperText={
                                      detailError?.[
                                        `products.${index}.quantity`
                                      ] || ""
                                    }
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      if (!validateQuantity(value)) {
                                        setDetailErrors((prev) => ({
                                          ...prev,
                                          [`products.${index}.quantity`]:
                                            "Quantity cannot be negative",
                                        }));
                                        return;
                                      }

                                      const newQuantity = parseFloat(value);
                                      const atomicQuantity =
                                        calculateQuantityInAtomicUnits(
                                          newQuantity,
                                          currentUnit,
                                          selectedProduct
                                        );

                                      // Check if breaking down a wholesale unit
                                      if (
                                        selectedProduct?.allowsUnitBreakdown &&
                                        currentUnit ===
                                          selectedProduct.baseUnit &&
                                        atomicQuantity %
                                          selectedProduct.conversionFactor !==
                                          0
                                      ) {
                                        setModalMessage(
                                          `Breaking down ${selectedProduct.baseUnit} into ${selectedProduct.atomicUnit} may result in potential loss of ${selectedProduct.potentialLoss}%`
                                        );
                                        setModalOpen(true);
                                      }

                                      form.setFieldValue(
                                        field.name,
                                        newQuantity
                                      );

                                      if (selectedProduct) {
                                        const currentPrice = getUnitPrice(
                                          product.name,
                                          currentUnit
                                        );
                                        const newTotalPrice = Math.ceil(
                                          newQuantity * currentPrice
                                        );
                                        setFieldValue(
                                          `products.${index}.totalPrice`,
                                          newTotalPrice
                                        );
                                      }
                                    }}
                                    onBlur={(event) => {
                                      const value = parseFloat(
                                        event.target.value
                                      );
                                      if (isNaN(value)) {
                                        setDetailErrors((prev) => ({
                                          ...prev,
                                          [`products.${index}.quantity`]:
                                            "Please enter a valid quantity",
                                        }));
                                        return;
                                      }

                                      const atomicQuantity =
                                        calculateQuantityInAtomicUnits(
                                          value,
                                          currentUnit,
                                          selectedProduct
                                        );

                                      if (
                                        selectedProduct &&
                                        atomicQuantity > selectedProduct.onhand &&
                                        company?.enableStockValidationNotification !== false
                                      ) {
                                        const unitDisplay = selectedProduct.atomicUnit && selectedProduct.atomicUnit !== 'none' ? ` ${selectedProduct.atomicUnit}` : '';
                                        setModalMessage(
                                          `Quantity cannot exceed available stock (${selectedProduct.onhand}${unitDisplay})`
                                        );
                                        setModalOpen(true);
                                      }
                                    }}
                                    variant="outlined"
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: "8px",
                                      },
                                      "& .MuiInputLabel-root": {
                                        color: "#666",
                                      },
                                    }}
                                  />
                                );
                              }}
                            </Field>

                            {/* Unit selector */}
                            <Field name={`products.${index}.unit`}>
                              {({ field, form }) => {
                                const availableUnits = getProductUnits(
                                  product.name
                                );
                                return (
                                  <Autocomplete
                                    {...field}
                                    options={availableUnits}
                                    value={field.value || "none"}
                                    style={{
                                      flex: "1",
                                      minWidth: "80px",
                                    }}
                                    renderInput={(params) => (
                                      <TextField
                                        {...params}
                                        label="Unit"
                                        error={
                                          !!detailError?.[
                                            `products.${index}.unit`
                                          ]
                                        }
                                        helperText={
                                          detailError?.[
                                            `products.${index}.unit`
                                          ] || ""
                                        }
                                        variant="outlined"
                                        sx={{
                                          "& .MuiOutlinedInput-root": {
                                            borderRadius: "8px",
                                          },
                                        }}
                                      />
                                    )}
                                    onChange={(_, newValue) => {
                                      form.setFieldValue(
                                        `products.${index}.unit`,
                                        newValue || "none"
                                      );

                                      // Update price based on selected unit
                                      const newPrice = getUnitPrice(
                                        product.name,
                                        newValue
                                      );
                                      setFieldValue(
                                        `products.${index}.price`,
                                        newPrice
                                      );

                                      // Recalculate total price
                                      const newTotalPrice = Math.ceil(
                                        product.quantity * newPrice
                                      );
                                      setFieldValue(
                                        `products.${index}.totalPrice`,
                                        newTotalPrice
                                      );
                                    }}
                                    freeSolo
                                    disableClearable
                                  />
                                );
                              }}
                            </Field>
                          </div>

                          {/* Price and Total Price fields */}
                          <div
                            style={{
                              display: "flex",
                              gap: "0.8rem",
                              flex: matchesMobile ? "1 1 100%" : "3",
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}>
                            <Field name={`products.${index}.price`}>
                              {({ field }) => (
                                <TextField
                                  {...field}
                                  label="Price"
                                  type="number"
                                  style={{
                                    flex: matchesMobile
                                      ? "1 1 calc(50% - 0.4rem)"
                                      : "1",
                                    minWidth: "100px",
                                  }}
                                  error={
                                    !!detailError?.[`products.${index}.price`]
                                  }
                                  helperText={
                                    detailError?.[`products.${index}.price`] ||
                                    ""
                                  }
                                  variant="outlined"
                                  onChange={(event) => {
                                    const newPrice = parseFloat(
                                      event.target.value
                                    );
                                    setFieldValue(
                                      `products.${index}.price`,
                                      newPrice
                                    );
                                    const newTotalPrice =
                                      product.quantity * newPrice;
                                    setFieldValue(
                                      `products.${index}.totalPrice`,
                                      Math.ceil(newTotalPrice)
                                    );
                                    validateReceiptDetail(values);
                                  }}
                                  sx={{
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: "8px",
                                    },
                                    "& .MuiInputLabel-root": {
                                      color: "#666",
                                    },
                                  }}
                                />
                              )}
                            </Field>
                            <Field name={`products.${index}.totalPrice`}>
                              {({ field }) => (
                                <TextField
                                  {...field}
                                  value={product.totalPrice}
                                  label="Total Price"
                                  readOnly
                                  style={{
                                    flex: matchesMobile
                                      ? "1 1 calc(50% - 0.4rem)"
                                      : "1",
                                    minWidth: "100px",
                                  }}
                                  variant="outlined"
                                  sx={{
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: "8px",
                                      backgroundColor: "#f5f5f5",
                                    },
                                    "& .MuiInputLabel-root": {
                                      color: "#666",
                                    },
                                  }}
                                />
                              )}
                            </Field>
                            <Button
                              variant="contained"
                              color="error"
                              onClick={() => remove(index)}
                              sx={{
                                borderRadius: "8px",
                                textTransform: "none",
                                height: "40px",
                                minWidth: "100px",
                              }}>
                              Remove
                            </Button>
                          </div>
                        </div>

                        {/* Remove button */}
                        {/* <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginTop: matchesMobile ? "0.5rem" : "0",
                          }}> */}

                        {/* </div> */}
                      </motion.div>
                    );
                  })}
                  <Button
                    variant="contained"
                    color="secondary"
                    type="button"
                    onClick={() => {
                      push({
                        name: "",
                        quantity: "",
                        unit: "none",
                        totalPrice: 0,
                        price: 0,
                      });
                    }}
                    disabled={
                      values.products.length > 0 &&
                      !Object.values(
                        values.products[values.products.length - 1]
                      ).every(Boolean)
                    }
                    sx={{
                      borderRadius: "8px",
                      textTransform: "none",
                      height: "45px",
                      marginTop: "1rem",
                    }}>
                    <i
                      className="bx bx-plus"
                      style={{ marginRight: "8px" }}></i>
                    Add Product
                  </Button>
                </div>
              )}
            </FieldArray>

            <div
              style={{
                marginTop: "2rem",
                padding: matchesMobile ? "1rem" : "1.5rem",
                background: "#f8f9fa",
                borderRadius: "8px",
              }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}>
                <Typography variant="h6" sx={{ color: "#333" }}>
                  Total
                </Typography>
                <Field name="total">
                  {() => (
                    <Typography variant="h6" sx={{ color: "#2196f3" }}>
                      ₵
                      {values.products?.reduce(
                        (sum, product) => sum + (product?.totalPrice || 0),
                        0
                      )}
                    </Typography>
                  )}
                </Field>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  flexWrap: "wrap",
                  marginBottom: "1rem",
                }}>
                <Field name="amountPaid">
                  {({ field, form }) => {
                    const hasError = Boolean(
                      form.errors.amountPaid && form.touched.amountPaid
                    );
                    return (
                      <TextField
                        {...field}
                        label="Amount Paid"
                        type="number"
                        placeholder="Amount Paid"
                        fullWidth
                        error={hasError}
                        helperText={hasError ? form.errors.amountPaid : ""}
                        variant="outlined"
                        onChange={(event) => {
                          setFieldValue("amountPaid", event.target.value || 0);
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px",
                          },
                          "& .MuiInputLabel-root": {
                            color: "#666",
                          },
                        }}
                      />
                    );
                  }}
                </Field>
                <Field name="discount">
                  {({ field, form }) => {
                    const hasError = Boolean(
                      form.errors.discount && form.touched.discount
                    );
                    return (
                      <TextField
                        {...field}
                        label="Discount"
                        type="number"
                        placeholder="Discount"
                        fullWidth
                        error={hasError}
                        helperText={hasError ? form.errors.discount : ""}
                        variant="outlined"
                        onChange={(event) => {
                          setFieldValue("discount", event.target.value);
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px",
                          },
                          "& .MuiInputLabel-root": {
                            color: "#666",
                          },
                        }}
                      />
                    );
                  }}
                </Field>
                <Field name="paymentMethod">
                  {({ field, form }) => {
                    const hasError = Boolean(
                      form.errors.paymentMethod && form.touched.paymentMethod
                    );
                    return (
                      <FormControl
                        fullWidth
                        error={hasError}
                        variant="outlined">
                        <InputLabel>Payment Method</InputLabel>
                        <Select
                          {...field}
                          label="Payment Method"
                          value={field.value || "cash"}
                          onChange={(event) => {
                            setFieldValue("paymentMethod", event.target.value);
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "8px",
                            },
                          }}>
                          <MenuItem value="cash">Cash</MenuItem>
                          <MenuItem value="card">Card</MenuItem>
                          <MenuItem value="mobile_money">Mobile Money</MenuItem>
                          <MenuItem value="bank_transfer">
                            Bank Transfer
                          </MenuItem>
                        </Select>
                        {hasError && (
                          <Typography
                            variant="caption"
                            color="error"
                            sx={{ mt: 0.5 }}>
                            {form.errors.paymentMethod}
                          </Typography>
                        )}
                      </FormControl>
                    );
                  }}
                </Field>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem",
                  background: "white",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  width: "75%",
                }}>
                <Typography variant="h6" sx={{ color: "#333" }}>
                  Balance
                </Typography>
                <Field name="balance">
                  {() => (
                    <Typography
                      variant="h6"
                      sx={{
                        color:
                          values.products?.reduce(
                            (sum, product) => sum + (product?.totalPrice || 0),
                            0
                          ) -
                            values.amountPaid -
                            values.discount >
                          0
                            ? "#f44336"
                            : "#4caf50",
                        fontWeight: 600,
                      }}>
                      {values.products?.reduce(
                        (sum, product) => sum + (product?.totalPrice || 0),
                        0
                      ) -
                        values.amountPaid -
                        values.discount}
                    </Typography>
                  )}
                </Field>
              </div>
            </div>

            <div
              style={{
                position: "fixed",
                bottom: "2rem",
                right: "2rem",
                display: "flex",
                gap: "1rem",
                zIndex: 1000,
                background: "white",
                padding: "1rem",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setPrint(true);
                  submitForm();
                }}
                disabled={loading || isSubmitting}
                sx={{
                  borderRadius: "8px",
                  textTransform: "none",
                  height: "45px",
                  minWidth: "150px",
                }}>
                {loading ? (
                  <CircularProgress size={24} />
                ) : (
                  <>
                    <i
                      className="bx bx-printer"
                      style={{ marginRight: "8px" }}></i>
                    Save and Print
                  </>
                )}
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => {
                  submitForm();
                }}
                disabled={loading || isSubmitting}
                sx={{
                  borderRadius: "8px",
                  textTransform: "none",
                  height: "45px",
                  minWidth: "120px",
                }}>
                {loading ? (
                  <CircularProgress size={24} />
                ) : (
                  <>
                    <i
                      className="bx bx-save"
                      style={{ marginRight: "8px" }}></i>
                    Save
                  </>
                )}
              </Button>
            </div>
          </Form>
        )}
      </Formik>

      {error && <ErrorAlert error={error} onClose={() => setError(null)} />}
      <Snackbar
        sx={{
          "& .MuiSnackbarContent-root": {
            color: owesDebt ? "red" : "white",
          },
        }}
        open={open}
        autoHideDuration={5000}
        onClose={() => setOpen(false)}
        message={modalMessage || "Sales successfully Recorded"}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      />

      {/* Modal for insufficient inventory */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description">
        <DialogTitle id="alert-dialog-title">
          {"Insufficient Inventory"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {modalMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={() => setModalOpen(false)} color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for new customer */}
      <Dialog
        open={newCustomerDialogOpen}
        onClose={() => setNewCustomerDialogOpen(false)}
        aria-labelledby="new-customer-dialog-title"
        aria-describedby="new-customer-dialog-description">
        <DialogTitle id="new-customer-dialog-title">
          {"Add New Customer"}
        </DialogTitle>
        {submittingForm ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignContent: "center",
              width: 316,
              height: 300,
            }}>
            <Loader type={3} />
          </div>
        ) : (
          <>
            <DialogContent>
              <DialogContentText id="new-customer-dialog-description">
                Enter the name of the new customer:
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                id="new-customer-name"
                label="Customer Name"
                type="text"
                fullWidth
                variant="standard"
                value={newCustomerName}
                onChange={(e) =>
                  setNewCustomerName(e.target.value.toLowerCase())
                }
              />
            </DialogContent>
            <DialogContent>
              <DialogContentText id="new-customer-dialog-description">
                Enter Company Name:
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                id="new-customer-company"
                label="Company Name"
                type="text"
                fullWidth
                variant="standard"
                value={newCustomerCompany}
                onChange={(e) =>
                  setNewCustomerCompany(e.target.value.toLowerCase())
                }
              />
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setNewCustomerDialogOpen(false)}
                color="primary">
                Cancel
              </Button>
              {newCustomerName && (
                <Button onClick={handleNewCustomerSubmit} color="primary">
                  Add
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog for new products */}
      <Dialog
        open={newProductDialogOpen}
        onClose={() => setNewProductDialogOpen(false)}>
        <DialogTitle>Add New Product</DialogTitle>
        {submittingForm ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignContent: "center",
              width: 600,
              height: 316,
            }}>
            <Loader type={3} />
          </div>
        ) : (
          <>
            <DialogContent>
              <DialogContentText>
                Please enter the details of the new product.
              </DialogContentText>

              <TextField
                autoFocus
                margin="dense"
                label="Product Name"
                name="name"
                fullWidth
                required
                value={newProduct.name}
                onChange={handleInputChange}
                error={!!errors.name}
                helperText={errors.name}
              />

              <TextField
                margin="dense"
                label="Sales Price"
                type="number"
                name="salesPrice"
                fullWidth
                required
                value={newProduct.salesPrice}
                onChange={handleInputChange}
                error={!!errors.salesPrice}
                helperText={errors.salesPrice}
              />

              <TextField
                margin="dense"
                label="Cost Price"
                type="number"
                name="costPrice"
                fullWidth
                required
                value={newProduct.costPrice}
                onChange={handleInputChange}
                error={!!errors.costPrice}
                helperText={errors.costPrice}
              />

              <TextField
                margin="dense"
                label="Available Quantity"
                type="number"
                name="onhand"
                fullWidth
                required
                value={newProduct.onhand}
                onChange={handleInputChange}
                error={!!errors.onhand}
                helperText={errors.onhand}
              />

              <TextField
                margin="dense"
                label="Base Unit (e.g., box, carton)"
                name="baseUnit"
                fullWidth
                required
                value={newProduct.baseUnit}
                onChange={handleInputChange}
                error={!!errors.baseUnit}
                helperText={
                  errors.baseUnit || "Primary unit for wholesale sales"
                }
              />

              {/* <FormControlLabel
                control={
                  <Switch
                    checked={newProduct.allowsUnitBreakdown}
                    onChange={(e) =>
                      handleInputChange({
                        target: {
                          name: "allowsUnitBreakdown",
                          value: e.target.checked,
                        },
                      })
                    }
                    name="allowsUnitBreakdown"
                  />
                }
                label="Allow unit breakdown"
              /> */}

              {newProduct.allowsUnitBreakdown && (
                <>
                  <TextField
                    margin="dense"
                    label="Atomic Unit (e.g., piece, bottle)"
                    name="atomicUnit"
                    fullWidth
                    value={newProduct.atomicUnit}
                    onChange={handleInputChange}
                    error={!!errors.atomicUnit}
                    helperText={
                      errors.atomicUnit || "Smallest unit for retail sales"
                    }
                  />

                  <TextField
                    margin="dense"
                    label="Conversion Factor"
                    type="number"
                    name="conversionFactor"
                    fullWidth
                    value={newProduct.conversionFactor}
                    onChange={handleInputChange}
                    error={!!errors.conversionFactor}
                    helperText={
                      errors.conversionFactor ||
                      "How many atomic units in one base unit"
                    }
                  />

                  <TextField
                    margin="dense"
                    label="Potential Loss (%)"
                    type="number"
                    name="potentialLoss"
                    fullWidth
                    value={newProduct.potentialLoss}
                    onChange={handleInputChange}
                    error={!!errors.potentialLoss}
                    helperText={
                      errors.potentialLoss ||
                      "Estimated loss when breaking down units"
                    }
                  />
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setNewProductDialogOpen(false)}
                color="primary">
                Cancel
              </Button>
              <Button onClick={handleNewProductSubmit} color="primary">
                Add Product
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Receipt Template for printing */}
      {printValues && (
        <div style={{ display: "none" }}>
          <ReceiptTemplate
            ref={printRef}
            customerName={printValues.customerName}
            customerCompany={printValues.customerCompany}
            products={printValues.products}
            total={printValues.total}
            balance={printValues.balance}
            amountPaid={printValues.amountPaid}
            discount={printValues.discount}
            date={today}
            workerName={worker.username ? worker.username : worker.name}
          />
        </div>
      )}
    </motion.div>
  );
};

export default MakeSales;
