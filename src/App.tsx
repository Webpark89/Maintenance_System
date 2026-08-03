import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Login from "./pages/Login.tsx";
import TechnicianBoard from "./pages/TechnicianBoard.tsx";
import AssessmentForm from "./pages/AssessmentForm.tsx";
import RequestForm from "./pages/RequestForm.tsx";
import NotificationCenter from "./pages/NotificationCenter.tsx";
import AssetManagement from "./pages/AssetManagement.tsx";
import Dashboard from "./pages/Dashboard.tsx";
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
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["supervisor"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/board"
            element={
              <ProtectedRoute allowedRoles={["technician", "supervisor"]}>
                <TechnicianBoard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/assets"
            element={
              <ProtectedRoute allowedRoles={["technician", "supervisor"]}>
                <AssetManagement />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/request"
            element={
              <ProtectedRoute allowedRoles={["requester", "technician", "supervisor"]}>
                <RequestForm />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={["requester", "technician", "supervisor"]}>
                <NotificationCenter />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/assessment/:id"
            element={
              <ProtectedRoute allowedRoles={["technician", "supervisor"]}>
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
