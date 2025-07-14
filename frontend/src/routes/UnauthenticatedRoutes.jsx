import React, { lazy } from "react";
import { Route, Routes } from "react-router-dom";

const SignIn = lazy(() => import("../views/SignIn"));
const Register = lazy(() => import("../views/common/Register"));
const LandingPage = lazy(() => import("../views/common/landingPage/LandingPage"));
const NoPage = lazy(() => import("../views/NoPage"));

const UnauthenticatedRoutes = ({ isLoggedIn }) => (
  <Routes>
    <Route path="/login" element={<SignIn isLoggedIn={isLoggedIn} />} />
    <Route path="/register" element={<Register isLoggedIn={isLoggedIn} />} />
    <Route path="/" element={<LandingPage isLoggedIn={isLoggedIn} />} />
    <Route path="*" element={<NoPage />} />
  </Routes>
);

export default UnauthenticatedRoutes;
