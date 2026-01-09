import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { ProtectedRoute, AdminRoute, OwnerRoute } from "@/components/ProtectedRoute";

// Testing Hub
import TestingHub from "./pages/TestingHub";

// Client App Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Inventory from "./pages/Inventory";
import Warehouses from "./pages/Warehouses";
import Transactions from "./pages/Transactions";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Suppliers from "./pages/Suppliers";
import PurchaseOrders from "./pages/PurchaseOrders";
import AuditLogs from "./pages/AuditLogs";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Marketing Pages
import MarketingLayout from "./pages/marketing/MarketingLayout";
import HomePage from "./pages/marketing/HomePage";
import FeaturesPage from "./pages/marketing/FeaturesPage";
import PricingPage from "./pages/marketing/PricingPage";

// Super Admin Pages
import SuperAdminLayout from "./pages/admin/SuperAdminLayout";
import BusinessesPage from "./pages/admin/BusinessesPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
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
              </Route>

              {/* Super Admin Panel */}
              <Route path="/admin" element={<SuperAdminLayout />}>
                <Route index element={<BusinessesPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="logs" element={<AdminLogsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>

              {/* Client POS Application */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
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
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
