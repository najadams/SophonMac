import React, { useState } from "react";
import { Formik, Form, Field, useField } from "formik";
import * as Yup from "yup";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Autocomplete,
  LinearProgress,
  Alert,
  Paper,
  Grid,
  Avatar,
  Divider,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  PersonAdd,
  Person,
  Email,
  Phone,
  Lock,
  AccountCircle,
  Visibility,
  VisibilityOff,
  Work,
} from "@mui/icons-material";
import { styled } from "@mui/system";
import { ROLES } from "../context/userRoles";
import { tableActions } from "../config/Functions";
import { useSelector } from "react-redux";

const StyledTextField = styled(TextField)({
  margin: "12px 0",
  '& .MuiOutlinedInput-root': {
    '&:hover fieldset': {
      borderColor: '#1976d2',
    },
  },
});

const StyledPaper = styled(Paper)({
  padding: '32px',
  marginTop: '24px',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
});

const HeaderBox = styled(Box)({
  textAlign: 'center',
  marginBottom: '32px',
});

const StyledAvatar = styled(Avatar)({
  width: 80,
  height: 80,
  margin: '0 auto 16px',
  backgroundColor: '#1976d2',
  fontSize: '2rem',
});

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Required"),
  username: Yup.string().required("Required"),
  role: Yup.string().required("Required"),
  email: Yup.string().email("Invalid email"),
  password: Yup.string().required("Required"),
  contact: Yup.string().required("Required"),
});

const MyTextField = ({ label, icon, ...props }) => {
  const [field, meta, helpers] = useField(props);
  const [showPassword, setShowPassword] = useState(false);

  const handleBlur = (event) => {
    if (props.name === 'username' || props.name === 'email') {
      const lowercaseValue = event.target.value.toLowerCase();
      helpers.setValue(lowercaseValue);
    }
    field.onBlur(event);
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <StyledTextField
      label={label}
      {...field}
      {...props}
      type={props.type === 'password' && showPassword ? 'text' : props.type}
      error={meta.touched && Boolean(meta.error)}
      helperText={meta.touched && meta.error}
      onBlur={handleBlur}
      InputProps={{
        startAdornment: icon && (
          <InputAdornment position="start">
            {icon}
          </InputAdornment>
        ),
        endAdornment: props.type === 'password' && (
          <InputAdornment position="end">
            <IconButton
              onClick={handleTogglePassword}
              edge="end"
              size="small"
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

const CreateUser = () => {
  const companyId = useSelector((state) => state.companyState.data.id);
  const workerRole = useSelector((state) => state.userState.currentUser.role);
  const [showAlert, setShowAlert] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="page">
      <Container maxWidth="lg">
        <StyledPaper elevation={3}>
          <HeaderBox>
            <StyledAvatar>
              <PersonAdd fontSize="large" />
            </StyledAvatar>
            <Typography variant="h4" component="h1" gutterBottom color="primary" fontWeight="bold">
              Create New User
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Add a new team member to your organization
            </Typography>
            <Divider sx={{ mt: 2, mb: 3 }} />
          </HeaderBox>
        <Formik
          initialValues={{
            name: "",
            username: "",
            role: "",
            email: "",
            password: "",
            contact: "",
          }}
          validationSchema={validationSchema}
          onSubmit={async (values, { setSubmitting, resetForm }) => {
            setSubmitting(true);
            setError(""); // Reset error message
            try {
              // Prepare data for backend
              const submitData = {
                companyId,
                name: values.name,
                username: values.username,
                contact: values.contact,
                password: values.password,
                role: values.role
              };
              // Only include email if it's provided
              if (values.email && values.email.trim()) {
                submitData.email = values.email;
              }
              await tableActions.addWorker(submitData);
              setShowAlert(true);
              setTimeout(() => {
                setShowAlert(false);
                resetForm();
              }, 1000);
            } catch (err) {
              // Capture error message from the server
              const errorMessage = err?.response?.data?.error || err?.message || err || "An error occurred while creating the user.";
              setError(errorMessage);
              setTimeout(() => {
                setError("")
              }, 4000);
              console.error('Error creating user:', err);
            }
            setSubmitting(false); // Ensure submitting is stopped
          }}> 
          {({ values, setFieldValue, isSubmitting }) => (
            <Form>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <MyTextField
                    name="name"
                    label="Full Name"
                    variant="outlined"
                    fullWidth
                    icon={<Person color="action" />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <MyTextField
                    name="username"
                    label="Username"
                    variant="outlined"
                    fullWidth
                    icon={<AccountCircle color="action" />}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Field name="role">
                    {({ field, form, meta }) => (
                      <Autocomplete
                        options={Object.values(ROLES)}
                        getOptionLabel={(option) => option}
                        renderInput={(params) => (
                          <StyledTextField
                            {...params}
                            label="Role"
                            variant="outlined"
                            error={meta.touched && Boolean(meta.error)}
                            helperText={meta.touched && meta.error}
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Work color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                        onChange={(event, value) => {
                          setFieldValue("role", value);
                        }}
                        value={values.role}
                        disableClearable
                      />
                    )}
                  </Field>
                </Grid>
                <Grid item xs={12} md={6}>
                  <MyTextField
                    name="email"
                    label="Email Address (Optional)"
                    variant="outlined"
                    fullWidth
                    icon={<Email color="action" />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <MyTextField
                    name="contact"
                    label="Phone Number"
                    variant="outlined"
                    fullWidth
                    icon={<Phone color="action" />}
                  />
                </Grid>
                <Grid item xs={12}>
                  <MyTextField
                    name="password"
                    label="Password"
                    type="password"
                    variant="outlined"
                    fullWidth
                    icon={<Lock color="action" />}
                  />
                </Grid>
              </Grid>
              {isSubmitting && (
                <Box mt={3}>
                  <LinearProgress sx={{ borderRadius: 2, height: 6 }} />
                </Box>
              )}
              <Box mt={4}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                  size="large"
                  fullWidth
                  startIcon={<PersonAdd />}
                  sx={{
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    borderRadius: 3,
                    background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                    boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
                      boxShadow: '0 6px 25px rgba(25, 118, 210, 0.4)',
                    },
                  }}
                >
                  {isSubmitting ? 'Creating User...' : 'Create User'}
                </Button>
              </Box>
              {/* Error Alert */}
              {error && (
                <div
                  style={{
                    position: "fixed",
                    top: "80px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 1000,
                  }}>
                  <Alert variant="filled" severity="error">
                    {error}
                  </Alert>
                </div>
              )}
              {/* Success Alert */}
              {showAlert && !error && (
                <div
                  style={{
                    position: "fixed",
                    top: "80px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 1000,
                  }}>
                  <Alert variant="filled" severity="success">
                    User created successfully!
                  </Alert>
                </div>
              )}
            </Form>
          )}
        </Formik>
        </StyledPaper>
      </Container>
    </div>
  );
};

export default CreateUser;
