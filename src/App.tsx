import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthWorkspaceProvider } from './contexts/AuthWorkspaceContext';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import QueriesPage from './pages/QueriesPage';
import LegalPage from './pages/LegalPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import InviteAcceptPage from './pages/InviteAcceptPage';
import AppShell from './components/AppShell';
import OverviewPage from './pages/crm/OverviewPage';
import DealsPage from './pages/crm/DealsPage';
import ContactsPage from './pages/crm/ContactsPage';
import CompaniesPage from './pages/crm/CompaniesPage';
import TasksPage from './pages/crm/TasksPage';
import ProductsPage from './pages/crm/ProductsPage';
import QuotesPage from './pages/crm/QuotesPage';
import TeamPage from './pages/crm/TeamPage';
import SettingsPage from './pages/crm/SettingsPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthWorkspaceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/queries" element={<QueriesPage />} />
            <Route path="/privacy" element={<LegalPage mode="privacy" />} />
            <Route path="/terms" element={<LegalPage mode="terms" />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/invite/:token" element={<InviteAcceptPage />} />

            <Route path="/app" element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="deals" element={<DealsPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthWorkspaceProvider>
    </ThemeProvider>
  );
}
