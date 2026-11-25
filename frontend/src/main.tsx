import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { FinanceProvider } from './store/FinanceContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import CashFlow from './pages/CashFlow'
import Simulator from './pages/Simulator'
import Health from './pages/Health'
import Assistant from './pages/Assistant'
import SettingsPage from './pages/Settings'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FinanceProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/cash-flow" element={<CashFlow />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/health" element={<Health />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </FinanceProvider>
  </StrictMode>,
)
