import React, { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Vendors from "../../views/Vendors";

const VendorDetails = lazy(() => import("../../views/VendorDetails"));

const VendorsRoutes = () => {
  return (
    <Routes>
      <Route index path={"/"} element={<Vendors />} />
      <Route  path={`/vendors/:id`} element={<VendorDetails />} />
    </Routes>
  );
};

export default VendorsRoutes;
