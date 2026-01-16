import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { BusinessProvider } from "./contexts/BusinessContext";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { ProtectedRoute, AdminRoute, OwnerRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Suppliers from "./pages/Suppliers";
import PurchaseOrders from "./pages/PurchaseOrders";
import Warehouses from "./pages/Warehouses";
import Expenses from "./pages/Expenses";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import NoAccess from "./pages/NoAccess";
import SubscriptionRequired from "./pages/SubscriptionRequired";
import AccountSuspended from "./pages/AccountSuspended";
import AccessDenied from "./pages/AccessDenied";
import TestingHub from "./pages/TestingHub";
import SuperAdminLayout from "./pages/admin/SuperAdminLayout";
import MissionControlDashboard from "./pages/admin/MissionControlDashboard";
import BusinessesPage from "./pages/admin/BusinessesPage";
import BusinessDetailPage from "./pages/admin/BusinessDetailPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import GlobalAuditPage from "./pages/admin/GlobalAuditPage";
import SystemSettingsPage from "./pages/admin/SystemSettingsPage";
import ImpersonationBanner from "./components/admin/ImpersonationBanner";

// Marketing pages
import HomePage from "./pages/marketing/HomePage";
import FeaturesPage from "./pages/marketing/FeaturesPage";
import PricingPage from "./pages/marketing/PricingPage";
import ContactPage from "./pages/marketing/ContactPage";
import MarketingLayout from "./pages/marketing/MarketingLayout";
import AdminLogsPage from "./pages/admin/AdminLogsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              {/* Testing Hub - Development Entry Point */}
              <Route path="/" element={<TestingHub />} />
              
              {/* Marketing Website */}
              <Route path="/marketing" element={<MarketingLayout />}>
                <Route index element={<HomePage />} />
                <Route path="features" element={<FeaturesPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="contact" element={<ContactPage />} />
              </Route>

              {/* Super Admin Panel */}
              <Route path="/admin" element={<SuperAdminLayout />}>
                <Route index element={<BusinessesPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="logs" element={<AdminLogsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>

              {/* Authentication & Status Pages */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/no-access" element={<NoAccess />} />
              <Route path="/subscription-required" element={<SubscriptionRequired />} />
              <Route path="/account-suspended" element={<AccountSuspended />} />
              <Route path="/access-denied" element={<AccessDenied />} />

              {/* Client POS Application */}
              <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/categories" element={<AdminRoute><Categories /></AdminRoute>} />
              <Route path="/inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
              <Route path="/warehouses" element={<AdminRoute><Warehouses /></AdminRoute>} />
              <Route path="/transactions" element={<AdminRoute><Transactions /></AdminRoute>} />
              <Route path="/expenses" element={<AdminRoute><Expenses /></AdminRoute>} />
              <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
              <Route path="/suppliers" element={<AdminRoute><Suppliers /></AdminRoute>} />
              <Route path="/purchase-orders" element={<AdminRoute><PurchaseOrders /></AdminRoute>} />
              <Route path="/audit-logs" element={<AdminRoute><AuditLogs /></AdminRoute>} />
              <Route path="/users" element={<OwnerRoute><Users /></OwnerRoute>} />
              <Route path="/settings" element={<OwnerRoute><Settings /></OwnerRoute>} />
              
              {/* 404 - Catch all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
