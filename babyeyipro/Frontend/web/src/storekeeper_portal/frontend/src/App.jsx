import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import Layout from './components/Layout'

import StockDashboard from './pages/StockDashboard'
import UniformInventory from './pages/UniformInventory'
import FoodInventory from './pages/FoodInventory'
import FoodReportPage from './pages/FoodReport'
import OtherInventory from './pages/OtherInventory'
import Suppliers from './pages/Suppliers'
import PurchaseOrders from './pages/PurchaseOrders'
import StockAdjustments from './pages/StockAdjustments'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Analytics from './pages/Analytics'
import Alerts from './pages/Alerts'

function LayoutRoute() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <LayoutRoute />,
    children: [
      { index: true, element: <StockDashboard /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'alerts', element: <Alerts /> },
      { path: 'suppliers', element: <Suppliers /> },
      { path: 'purchase-orders', element: <PurchaseOrders /> },
      { path: 'uniform-inventory', element: <UniformInventory /> },
      { path: 'food-inventory', element: <FoodInventory /> },
      { path: 'food-reports', element: <FoodReportPage /> },
      { path: 'other-inventory', element: <OtherInventory /> },
      { path: 'stock-adjustments', element: <StockAdjustments /> },
      { path: 'reports', element: <Reports /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
