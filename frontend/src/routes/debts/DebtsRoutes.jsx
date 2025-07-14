import React, { lazy } from 'react'
import { Routes, Route } from 'react-router-dom'

const Debt = lazy(() => import("../../views/Debt"))

const DebtsRoutes = () => {
  return (
      <Routes>
          <Route index to={'/'} element={<Debt />} />
    </Routes>
  )
}

export default DebtsRoutes