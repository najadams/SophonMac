import { useState, useContext } from "react";
import { Formik, Field, Form } from "formik";
import { TextField } from "formik-material-ui";
import Button from "@mui/material/Button";
import * as Yup from "yup";
import LinearProgress from "@mui/material/LinearProgress";
import {
  Typography,
  Snackbar,
  Box,
  Paper,
  Grid,
  InputAdornment,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import { DialogContext } from "../../context/context";
import { useDispatch, useSelector } from "react-redux";
import { ActionCreators } from "../../actions/action";
import { tableActions } from "../../config/Functions";
import { motion } from "framer-motion";
import { alpha } from "@mui/material/styles";
import { useQueryClient } from "react-query";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required("Product name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters")
    .matches(
      /^[a-zA-Z0-9\s-]+$/,
      "Only letters, numbers, spaces, and hyphens are allowed"
    ),
  category: Yup.string(),
  baseUnit: Yup.string(),
  unitConversions: Yup.array()
    .of(
      Yup.object().shape({
        fromUnit: Yup.string().required("From unit is required"),
        toUnit: Yup.string().required("To unit is required"),
        conversionRate: Yup.number()
          .required("Conversion rate is required")
          .positive("Conversion rate must be positive"),
        salesPrice: Yup.number()
          .required("Unit price is required")
          .positive("Unit price must be positive"),
      })
    )
    .nullable()
    .default([]),
  costPrice: Yup.number()
    .required("Cost price is required")
    .min(0, "Cost price cannot be negative")
    .max(1000000, "Cost price is too high")
    .typeError("Cost price must be a number"),
  salesPrice: Yup.number()
    .required("Sales price is required")
    .min(0, "Sales price cannot be negative")
    .max(1000000, "Sales price is too high")
    .typeError("Sales price must be a number")
    .test(
      "sales-price",
      "Sales price must be higher than cost price",
      function (value) {
        return value > this.parent.costPrice;
      }
    ),
  onhand: Yup.number()
    .required("Quantity is required")
    .min(0, "Quantity cannot be negative")
    .max(1000000, "Quantity is too high")
    .typeError("Quantity must be a number"),
  reorderPoint: Yup.number()
    .min(0, "Reorder point cannot be negative")
    .max(1000000, "Reorder point is too high")
    .typeError("Reorder point must be a number"),
  minimumStock: Yup.number()
    .min(0, "Minimum stock cannot be negative")
    .max(1000000, "Minimum stock is too high")
    .typeError("Minimum stock must be a number"),
  description: Yup.string(),
  sku: Yup.string(),
  barcode: Yup.string(),
});

const ProductForm = ({ data, editMutation, onClose, onProductUpdate }) => {
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);
  const companyId = useSelector((state) => state.companyState.data.id);
  const { allowedUnits, allowedCategories } = useSelector(
    (state) => state.companyState
  );
  const handleClose = onClose || useContext(DialogContext);
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const initialValues = data
    ? {
        ...data,
        unitConversions: data.unitConversions || [],
      }
    : {
        name: "",
        category: "",
        baseUnit: "",
        unitConversions: [],
        costPrice: "",
        salesPrice: "",
        onhand: "",
        reorderPoint: "",
        minimumStock: "",
        description: "",
        sku: "",
        barcode: "",
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          backgroundColor: alpha("#fff", 0.8),
          backdropFilter: "blur(10px)",
        }}>
        <Typography
          variant="h5"
          sx={{
            mb: 4,
            fontWeight: 500,
            color: "primary.main",
            textAlign: "center",
          }}>
          {data ? "Edit Product" : "Add New Product"}
        </Typography>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={async (values, { setSubmitting }) => {
            values.name = values.name.trim().toLowerCase();
            setError(null);
            setSubmitting(true);
            try {
              let error;
              let product;
              if (data) {
                error = await tableActions.updateProduct({
                  ...values,
                  unitConversions: values.unitConversions || [],
                });
              } else {
                const result = await tableActions.addProduct({
                  ...values,
                  companyId,
                  unitConversions: values.unitConversions || [],
                });
                if (typeof result === "string") {
                  error = result;
                } else {
                  product = result;
                  dispatch(ActionCreators.fetchInventorySuccess(product));
                  dispatch(ActionCreators.addProduct());
                  setDone(true);
                  // Invalidate React Query cache
                  queryClient.invalidateQueries(["api/products", companyId]);
                  // Notify parent component
                  if (onProductUpdate) {
                    onProductUpdate(product);
                  }
                }
              }
              if (error) {
                setError(error.message || error.toString() || 'An error occurred');
              } else {
                setOpen(true);
                if (editMutation?.mutate) {
                  editMutation.mutate(values);
                }
                // Notify parent component for edits too
                if (data && onProductUpdate) {
                  onProductUpdate(values);
                }
                setTimeout(() => {
                  if (handleClose) handleClose();
                }, 2000);
              }
            } catch (err) {
              console.error(err);
              setError("An error occurred while saving the product");
            } finally {
              setSubmitting(false);
            }
          }}>
          {({
            submitForm,
            isSubmitting,
            handleChange,
            resetForm,
            values,
            errors,
            touched,
            setFieldValue,
          }) => (
            <Form>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Field
                    component={TextField}
                    name="name"
                    type="text"
                    label="Product Name"
                    fullWidth
                    variant="outlined"
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl
                    fullWidth
                    error={touched.category && Boolean(errors.category)}>
                    <InputLabel>Category</InputLabel>
                    <Field
                      as={Select}
                      name="category"
                      label="Category"
                      variant="outlined">
                      {allowedCategories?.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Field>
                    <FormHelperText>
                      {touched.category && errors.category}
                    </FormHelperText>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl
                    fullWidth
                    error={touched.baseUnit && Boolean(errors.baseUnit)}>
                    <InputLabel>Base Unit</InputLabel>
                    <Field
                      as={Select}
                      name="baseUnit"
                      label="Base Unit"
                      variant="outlined">
                      {allowedUnits?.map((unit) => (
                        <MenuItem key={unit} value={unit}>
                          {unit}
                        </MenuItem>
                      ))}
                    </Field>
                    <FormHelperText>
                      {touched.baseUnit && errors.baseUnit}
                    </FormHelperText>
                  </FormControl>
                </Grid>

                {values.baseUnit && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Unit Conversions
                    </Typography>
                    <Stack spacing={2}>
                      {(values.unitConversions || []).map(
                        (conversion, index) => (
                          <Grid container spacing={2} key={index}>
                            <Grid item xs={12} sm={3}>
                              <FormControl fullWidth>
                                <InputLabel>From Unit</InputLabel>
                                <Field
                                  as={Select}
                                  name={`unitConversions.${index}.fromUnit`}
                                  label="From Unit"
                                  variant="outlined">
                                  {values.baseUnit && (
                                    <MenuItem key={values.baseUnit} value={values.baseUnit}>
                                      {values.baseUnit}
                                    </MenuItem>
                                  )}
                                </Field>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <FormControl fullWidth>
                                <InputLabel>To Unit</InputLabel>
                                <Field
                                  as={Select}
                                  name={`unitConversions.${index}.toUnit`}
                                  label="To Unit"
                                  variant="outlined">
                                  {allowedUnits?.filter(unit => unit !== values.baseUnit).map((unit) => (
                                    <MenuItem key={unit} value={unit}>
                                      {unit}
                                    </MenuItem>
                                  ))}
                                </Field>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <Field
                                component={TextField}
                                name={`unitConversions.${index}.conversionRate`}
                                type="number"
                                label="Conversion Rate"
                                fullWidth
                                variant="outlined"
                                error={
                                  touched.unitConversions?.[index]
                                    ?.conversionRate &&
                                  Boolean(
                                    errors.unitConversions?.[index]
                                      ?.conversionRate
                                  )
                                }
                                helperText={
                                  touched.unitConversions?.[index]
                                    ?.conversionRate &&
                                  errors.unitConversions?.[index]
                                    ?.conversionRate
                                }
                              />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <Field
                                component={TextField}
                                name={`unitConversions.${index}.salesPrice`}
                                type="number"
                                label="Unit Price"
                                fullWidth
                                variant="outlined"
                                error={
                                  touched.unitConversions?.[index]?.salesPricePrice &&
                                  Boolean(
                                    errors.unitConversions?.[index]?.salesPrice
                                  )
                                }
                                helperText={
                                  touched.unitConversions?.[index]?.salesrice &&
                                  errors.unitConversions?.[index]?.salesPrice
                                }
                              />
                            </Grid>
                            <Grid item xs={12} sm={0}>
                              <Tooltip title="Remove Conversion">
                                <IconButton
                                  color="error"
                                  onClick={() => {
                                    const newConversions = [
                                      ...values.unitConversions,
                                    ];
                                    newConversions.splice(index, 1);
                                    setFieldValue(
                                      "unitConversions",
                                      newConversions
                                    );
                                  }}>
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Grid>
                          </Grid>
                        )
                      )}
                      <Button
                        startIcon={<AddIcon />}
                        onClick={() => {
                          const newConversions = [
                            ...(values.unitConversions || []),
                            {
                              fromUnit: "",
                              toUnit: "",
                              conversionRate: "",
                              salesPrice: "",
                            },
                          ];
                          setFieldValue("unitConversions", newConversions);
                        }}>
                        Add Unit Conversion
                      </Button>
                    </Stack>
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <Field
                    component={TextField}
                    type="number"
                    label="Cost Price"
                    name="costPrice"
                    fullWidth
                    variant="outlined"
                    error={touched.costPrice && Boolean(errors.costPrice)}
                    helperText={touched.costPrice && errors.costPrice}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₵</InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Field
                    component={TextField}
                    type="number"
                    label="Sales Price"
                    name="salesPrice"
                    fullWidth
                    variant="outlined"
                    error={touched.salesPrice && Boolean(errors.salesPrice)}
                    helperText={touched.salesPrice && errors.salesPrice}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₵</InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Field
                    component={TextField}
                    type="number"
                    label="Quantity on Hand"
                    name="onhand"
                    fullWidth
                    variant="outlined"
                    error={touched.onhand && Boolean(errors.onhand)}
                    helperText={touched.onhand && errors.onhand}
                    disabled={data}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Field
                    component={TextField}
                    type="number"
                    label="Reorder Point"
                    name="reorderPoint"
                    fullWidth
                    variant="outlined"
                    error={touched.reorderPoint && Boolean(errors.reorderPoint)}
                    helperText={touched.reorderPoint && errors.reorderPoint}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Field
                    component={TextField}
                    type="number"
                    label="Minimum Stock"
                    name="minimumStock"
                    fullWidth
                    variant="outlined"
                    error={touched.minimumStock && Boolean(errors.minimumStock)}
                    helperText={touched.minimumStock && errors.minimumStock}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Field
                    component={TextField}
                    name="sku"
                    type="text"
                    label="SKU"
                    fullWidth
                    variant="outlined"
                    error={touched.sku && Boolean(errors.sku)}
                    helperText={touched.sku && errors.sku}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Field
                    component={TextField}
                    name="barcode"
                    type="text"
                    label="Barcode"
                    fullWidth
                    variant="outlined"
                    error={touched.barcode && Boolean(errors.barcode)}
                    helperText={touched.barcode && errors.barcode}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Field
                    component={TextField}
                    name="description"
                    type="text"
                    label="Description"
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    error={touched.description && Boolean(errors.description)}
                    helperText={touched.description && errors.description}
                  />
                </Grid>

                {isSubmitting && (
                  <Grid item xs={12}>
                    <LinearProgress sx={{ height: 6, borderRadius: 3 }} />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Box
                    sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                    {done ? (
                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={() => {
                          resetForm();
                          setDone(false);
                        }}
                        sx={{
                          px: 4,
                          py: 1.5,
                          borderRadius: 2,
                          textTransform: "none",
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            transform: "scale(1.02)",
                          },
                        }}>
                        Product Added! Click to Add New Product
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="primary"
                        disabled={
                          isSubmitting || Object.keys(errors).length > 0
                        }
                        onClick={submitForm}
                        size="large"
                        sx={{
                          px: 4,
                          py: 1.5,
                          borderRadius: 2,
                          textTransform: "none",
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            transform: "scale(1.02)",
                          },
                        }}>
                        {data ? "Save Changes" : "Add Product"}
                      </Button>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>

        {error && (
          <Alert
            severity="error"
            sx={{
              mt: 2,
              borderRadius: 1,
            }}>
            {error}
          </Alert>
        )}

        <Snackbar
          open={open}
          autoHideDuration={5000}
          onClose={() => setOpen(false)}
          message={
            !data
              ? "Product added successfully"
              : "Product Changed Successfully"
          }
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        />
      </Paper>
    </motion.div>
  );
};

export default ProductForm;
