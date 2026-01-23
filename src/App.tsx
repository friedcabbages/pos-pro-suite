import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { BusinessProvider } from "./contexts/BusinessContext";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { UpgradeModalProvider } from "@/contexts/UpgradeModalContext";
import { ProtectedRoute, AdminRoute, OwnerRoute } from "./components/ProtectedRoute";
import { FeatureRoute } from "@/components/FeatureRoute";
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
              <UpgradeModalProvider>
              <ImpersonationBanner />
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

                {/* Client POS Application */}
                <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                <Route path="/categories" element={<AdminRoute><Categories /></AdminRoute>} />
                <Route path="/inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
                <Route path="/warehouses" element={<AdminRoute><Warehouses /></AdminRoute>} />
                <Route path="/transactions" element={<AdminRoute><Transactions /></AdminRoute>} />
                {/* /expenses is feature-gated below */}
                <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
                <Route
                  path="/reports-advanced"
                  element={
                    <AdminRoute>
                      <FeatureRoute
                        featureKey="reports_advanced"
                        requiredPlan="pro"
                        title="Advanced Reports"
                        description="Advanced analytics are available on Pro and Enterprise."
                        upsell="This feature is available on the Pro Plan. Upgrade now to unlock Advanced Reports and more."
                      >
                        <ReportsAdvanced />
                      </FeatureRoute>
                    </AdminRoute>
                  }
                />
                <Route path="/suppliers" element={<AdminRoute><Suppliers /></AdminRoute>} />
                <Route
                  path="/purchase-orders"
                  element={
                    <AdminRoute>
                      <FeatureRoute
                        featureKey="purchase_orders"
                        requiredPlan="pro"
                        title="Purchase Orders"
                        description="Purchase Orders are available on Pro and Enterprise."
                        upsell="This feature is available on the Pro Plan. Upgrade now to unlock Expenses, Purchase Orders, and more."
                      >
                        <PurchaseOrders />
                      </FeatureRoute>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/expenses"
                  element={
                    <AdminRoute>
                      <FeatureRoute
                        featureKey="expenses"
                        requiredPlan="pro"
                        title="Expenses"
                        description="Expense tracking is available on Pro and Enterprise."
                        upsell="This feature is available on the Pro Plan. Upgrade now to unlock Expenses, Purchase Orders, and more."
                      >
                        <Expenses />
                      </FeatureRoute>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/audit-logs"
                  element={
                    <AdminRoute>
                      <FeatureRoute
                        featureKey="audit_logs_full"
                        requiredPlan="enterprise"
                        title="Audit Logs"
                        description="Full audit logs and compliance mode are available on Enterprise."
                        upsell="This feature is available on the Enterprise Plan. Upgrade now for full audit logs, compliance mode, and priority support."
                      >
                        <AuditLogs />
                      </FeatureRoute>
                    </AdminRoute>
                  }
                />
                <Route path="/users" element={<OwnerRoute><Users /></OwnerRoute>} />
                <Route path="/settings" element={<OwnerRoute><Settings /></OwnerRoute>} />
                <Route path="/subscription" element={<OwnerRoute><Subscription /></OwnerRoute>} />
                <Route path="/activity" element={<AdminRoute><ActivityHistory /></AdminRoute>} />
                
                {/* 404 - Catch all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </UpgradeModalProvider>
            </BusinessProvider>
          </ImpersonationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
