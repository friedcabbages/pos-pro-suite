import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { ProtectedRoute, AdminRoute, OwnerRoute } from "@/components/ProtectedRoute";
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
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              
              {/* Public routes for all authenticated users */}
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              
              {/* Admin-only routes */}
              <Route path="/categories" element={<AdminRoute><Categories /></AdminRoute>} />
              <Route path="/inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
              <Route path="/warehouses" element={<AdminRoute><Warehouses /></AdminRoute>} />
              <Route path="/transactions" element={<AdminRoute><Transactions /></AdminRoute>} />
              <Route path="/expenses" element={<AdminRoute><Expenses /></AdminRoute>} />
              <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
              <Route path="/suppliers" element={<AdminRoute><Suppliers /></AdminRoute>} />
              <Route path="/purchase-orders" element={<AdminRoute><PurchaseOrders /></AdminRoute>} />
              <Route path="/audit-logs" element={<AdminRoute><AuditLogs /></AdminRoute>} />
              
              {/* Owner-only routes */}
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
