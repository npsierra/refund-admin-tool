import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Queue } from './pages/Queue'
import { RefundDetail } from './pages/RefundDetail'
import { NewRefund } from './pages/NewRefund'
import { AuditLog } from './pages/AuditLog'
import { Merchants } from './pages/Merchants'
import { SettingsPage } from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="queue" element={<Queue />} />
          <Route path="refunds/:id" element={<RefundDetail />} />
          <Route path="new" element={<NewRefund />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="merchants" element={<Merchants />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
