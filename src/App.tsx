import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import UserManagement from "./pages/UserManagement";
import Analytics from "./pages/Analytics";
import BranchDashboardLayout from "./components/BranchDashboardLayout";
import BranchOverview from "./pages/branch/BranchOverview";
import BranchCustomers from "./pages/branch/BranchCustomers";
import BranchInventory from "./pages/branch/BranchInventory";
import BranchSales from "./pages/branch/BranchSales";
import BranchPayments from "./pages/branch/BranchPayments";
import BranchExpenses from "./pages/branch/BranchExpenses";
import BranchAnalytics from "./pages/branch/BranchAnalytics";
import BranchActivityLogs from "./pages/branch/BranchActivityLogs";
import BranchUserManagement from "./pages/branch/BranchUserManagement";
import BranchProfile from "./pages/branch/BranchProfile";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={["GENERAL_ADMIN", "GENERAL_VIEWER"]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="analytics"
          element={
            <ProtectedRoute allowedRoles={["GENERAL_ADMIN", "GENERAL_VIEWER"]}>
              <Analytics />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Branch dashboard with its own layout */}
      <Route
        path="/dashboard/branch/:branchId"
        element={
          <ProtectedRoute>
            <BranchDashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BranchOverview />} />
        <Route
          path="customers"
          element={
            <ProtectedRoute allowedRoles={["GENERAL_ADMIN", "BRANCH_ADMIN", "BRANCH_MEMBER"]}>
              <BranchCustomers />
            </ProtectedRoute>
          }
        />
        <Route path="inventory" element={<BranchInventory />} />
        <Route path="sales" element={<BranchSales />} />
        <Route path="payments" element={<BranchPayments />} />
        <Route path="expenses" element={<BranchExpenses />} />
        <Route
          path="analytics"
          element={
            <ProtectedRoute allowedRoles={["GENERAL_ADMIN", "GENERAL_VIEWER", "BRANCH_ADMIN"]}>
              <BranchAnalytics />
            </ProtectedRoute>
          }
        />
        <Route path="activity" element={<BranchActivityLogs />} />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={["GENERAL_ADMIN", "BRANCH_ADMIN"]}>
              <BranchUserManagement />
            </ProtectedRoute>
          }
        />
        <Route path="profile" element={<BranchProfile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    <PWAInstallPrompt />
    <Toaster />
  </BrowserRouter>
);

export default App;
