import React, { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'


const SalesOrders = lazy(() => import("../../views/SalesOrders"))
const EditSales = lazy(() => import("../../components/forms/EditSales"))

const SalesRoutes = () => {
    return (
      <Routes>
        <Route index path={"/"} element={<SalesOrders />} />
        <Route path={"/:id"} element={<EditSales />} />
      </Routes>
    );
}

export default SalesRoutes