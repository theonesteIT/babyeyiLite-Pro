import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AssetInventory from './pages/AssetInventory'
import AddAsset from './pages/AddAsset'
import AssetDetails from './pages/AssetDetails'
import Categories from './pages/Categories'
import Assignments from './pages/Assignments'
import Returns from './pages/Returns'
import Transfers from './pages/Transfers'
import Maintenance from './pages/Maintenance'
import PreventiveMaintenance from './pages/PreventiveMaintenance'
import Warranty from './pages/Warranty'
import Depreciation from './pages/Depreciation'
import Audit from './pages/Audit'
import LostDamaged from './pages/LostDamaged'
import Disposal from './pages/Disposal'
import QRBarcode from './pages/QRBarcode'
import Reports from './pages/Reports'
import AssetAnalytics from './pages/AssetAnalytics'
import NotificationsPage from './pages/Notifications'
import UsersPage from './pages/Users'
import SettingsPage from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<AssetInventory />} />
        <Route path="add-asset" element={<AddAsset />} />
        <Route path="asset-details/:id" element={<AssetDetails />} />
        <Route path="categories" element={<Categories />} />
        <Route path="analytics" element={<AssetAnalytics />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="returns" element={<Returns />} />
        <Route path="transfers" element={<Transfers />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="preventive" element={<PreventiveMaintenance />} />
        <Route path="warranty" element={<Warranty />} />
        <Route path="depreciation" element={<Depreciation />} />
        <Route path="audit" element={<Audit />} />
        <Route path="lost-damaged" element={<LostDamaged />} />
        <Route path="disposal" element={<Disposal />} />
        <Route path="qr-barcode" element={<QRBarcode />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
