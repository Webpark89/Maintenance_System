import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Login from "./pages/Login.tsx";
import RainLoginPage from "./pages/RainLoginPage.tsx";
import TechnicianBoard from "./pages/TechnicianBoard.tsx";
import AssessmentForm from "./pages/AssessmentForm.tsx";
import RequestForm from "./pages/RequestForm.tsx";
import NotificationCenter from "./pages/NotificationCenter.tsx";
import AssetManagement from "./pages/AssetManagement.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import UserManagement from "./pages/UserManagement.tsx";
import RoleManagement from "./pages/RoleManagement.tsx";
import InventoryManagement from "./pages/InventoryManagement.tsx";
import PMSchedule from "./pages/PMSchedule.tsx";
import AuditLogs from "./pages/AuditLogs.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login-rain" element={<RainLoginPage />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredPermission="dashboard:view">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute requiredPermission="user:read">
                <UserManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/roles"
            element={
              <ProtectedRoute requiredPermission="role:manage">
                <RoleManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute requiredPermission="inventory:read">
                <InventoryManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/pm-schedules"
            element={
              <ProtectedRoute requiredPermission="pm:read">
                <PMSchedule />
              </ProtectedRoute>
            }
          />

          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute requiredPermission="audit_log:read">
                <AuditLogs />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/board"
            element={
              <ProtectedRoute requiredPermission="work_order:read">
                <TechnicianBoard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/assets"
            element={
              <ProtectedRoute requiredPermission="asset:read">
                <AssetManagement />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/request"
            element={
              <ProtectedRoute requiredPermission="work_order:create">
                <RequestForm />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationCenter />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/assessment/:id"
            element={
              <ProtectedRoute requiredAnyPermissions={["work_order:assess", "work_order:read"]}>
                <AssessmentForm />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
