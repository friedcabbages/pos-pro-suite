import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { BusinessProvider } from "./contexts/BusinessContext";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { UpgradeModalProvider } from "@/contexts/UpgradeModalContext";
import { DataLayerProvider } from "@/data/DataLayerProvider";
import { ProtectedRoute, AdminRoute, OwnerRoute } from "./components/ProtectedRoute";
import { FeatureRoute } from "@/components/FeatureRoute";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Fnb from "./pages/Fnb";
import Service from "./pages/Service";
import Venue from "./pages/Venue";
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
import ReportsAdvanced from "./pages/ReportsAdvanced";
import AuditLogs from "./pages/AuditLogs";
import Onboarding from "./pages/Onboarding";
import Subscription from "./pages/Subscription";
import ActivityHistory from "./pages/ActivityHistory";
import NotFound from "./pages/NotFound";
import NoAccess from "./pages/NoAccess";
import SubscriptionRequired from "./pages/SubscriptionRequired";
import AccountSuspended from "./pages/AccountSuspended";
import AccessDenied from "./pages/AccessDenied";

// F&B pages
import FnbDashboard from "./pages/fnb/FnbDashboard";
import FnbFloorPlan from "./pages/fnb/FnbFloorPlan";
import FnbTables from "./pages/fnb/FnbTables";
import FnbOrders from "./pages/fnb/FnbOrders";
import FnbKDS from "./pages/fnb/FnbKDS";
import FnbCashier from "./pages/fnb/FnbCashier";
import FnbMenu from "./pages/fnb/FnbMenu";
import FnbInventory from "./pages/fnb/FnbInventory";
import FnbReports from "./pages/fnb/FnbReports";

// Public ordering pages
import TableOrderPage from "./pages/order/TableOrderPage";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ImpersonationProvider>
            <BusinessProvider>
              <DataLayerProvider>
                <UpgradeModalProvider>
                <ImpersonationBanner />
                <Routes>
                {/* Root redirect to auth */}
                <Route path="/" element={<Navigate to="/auth" replace />} />
                
                {/* Marketing Website */}
                <Route path="/marketing" element={<MarketingLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="features" element={<FeaturesPage />} />
                  <Route path="pricing" element={<PricingPage />} />
                  <Route path="contact" element={<ContactPage />} />
                </Route>

                {/* Super Admin Panel - Mission Control */}
                <Route path="/admin" element={<SuperAdminLayout />}>
                  <Route index element={<MissionControlDashboard />} />
                  <Route path="businesses" element={<BusinessesPage />} />
                  <Route path="businesses/:businessId" element={<BusinessDetailPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="logs" element={<GlobalAuditPage />} />
                  <Route path="settings" element={<SystemSettingsPage />} />
                </Route>

                {/* Authentication & Status Pages */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/no-access" element={<NoAccess />} />
                <Route path="/subscription-required" element={<SubscriptionRequired />} />
                <Route path="/account-suspended" element={<AccountSuspended />} />
                <Route path="/access-denied" element={<AccessDenied />} />

                {/* Public Ordering (customer-facing, no auth required) */}
                <Route path="/order/table/:token" element={<TableOrderPage />} />

                {/* Global routes (not business-type-specific) */}
                <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/users" element={<OwnerRoute><Users /></OwnerRoute>} />
                <Route path="/settings" element={<OwnerRoute><Settings /></OwnerRoute>} />
                <Route path="/subscription" element={<OwnerRoute><Subscription /></OwnerRoute>} />
                <Route path="/activity" element={<AdminRoute><ActivityHistory /></AdminRoute>} />

                {/* Retail routes (standalone) */}
                <Route path="/retail/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
                <Route path="/retail/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                <Route path="/retail/categories" element={<AdminRoute><Categories /></AdminRoute>} />
                <Route path="/retail/inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
                <Route path="/retail/warehouses" element={<AdminRoute><Warehouses /></AdminRoute>} />
                <Route path="/retail/transactions" element={<AdminRoute><Transactions /></AdminRoute>} />
                <Route path="/retail/reports" element={<AdminRoute><Reports /></AdminRoute>} />
                <Route
                  path="/retail/reports-advanced"
                  element={
                    <AdminRoute>
                      <FeatureRoute featureKey="reports_advanced" fallbackPath="/retail/reports">
                        <ReportsAdvanced />
                      </FeatureRoute>
                    </AdminRoute>
                  }
                />
                <Route path="/retail/suppliers" element={<AdminRoute><Suppliers /></AdminRoute>} />
                <Route
                  path="/retail/purchase-orders"
                  element={
                    <AdminRoute>
                      <FeatureRoute featureKey="purchase_orders">
                        <PurchaseOrders />
                      </FeatureRoute>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/retail/expenses"
                  element={
                    <AdminRoute>
                      <FeatureRoute featureKey="expenses">
                        <Expenses />
                      </FeatureRoute>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/retail/audit-logs"
                  element={
                    <AdminRoute>
                      <FeatureRoute featureKey="audit_logs_full">
                        <AuditLogs />
                      </FeatureRoute>
                    </AdminRoute>
                  }
                />

                {/* F&B routes (standalone) */}
                <Route path="/fnb" element={<ProtectedRoute><Navigate to="/fnb/dashboard" replace /></ProtectedRoute>} />
                <Route path="/fnb/dashboard" element={<ProtectedRoute><FnbDashboard /></ProtectedRoute>} />
                <Route path="/fnb/floor-plan" element={<AdminRoute><FnbFloorPlan /></AdminRoute>} />
                <Route path="/fnb/tables" element={<AdminRoute><FnbTables /></AdminRoute>} />
                <Route path="/fnb/orders" element={<ProtectedRoute><FnbOrders /></ProtectedRoute>} />
                <Route path="/fnb/kds" element={<ProtectedRoute><FnbKDS /></ProtectedRoute>} />
                <Route path="/fnb/cashier" element={<ProtectedRoute><FnbCashier /></ProtectedRoute>} />
                <Route path="/fnb/menu" element={<AdminRoute><FnbMenu /></AdminRoute>} />
                <Route path="/fnb/inventory" element={<AdminRoute><FnbInventory /></AdminRoute>} />
                <Route path="/fnb/reports" element={<AdminRoute><FnbReports /></AdminRoute>} />

                {/* Service & Venue routes (placeholder) */}
                <Route path="/service" element={<ProtectedRoute><Service /></ProtectedRoute>} />
                <Route path="/venue" element={<ProtectedRoute><Venue /></ProtectedRoute>} />
                
                {/* 404 - Catch all */}
                <Route path="*" element={<NotFound />} />
                </Routes>
                </UpgradeModalProvider>
              </DataLayerProvider>
            </BusinessProvider>
          </ImpersonationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
