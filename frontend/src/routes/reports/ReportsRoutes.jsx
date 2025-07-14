import { lazy } from "react";
import { Routes, Route } from "react-router-dom";

const Reports = lazy(() => import("../../views/Reports"));

const ReportsRoutes = () => {
  return (
    <Routes>
      <Route index to={"/"} element={<Reports />} />
    </Routes>
  );
};

export default ReportsRoutes;
