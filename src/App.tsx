import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login.tsx";
import TechnicianBoard from "./pages/TechnicianBoard.tsx";
import AssessmentForm from "./pages/AssessmentForm.tsx";
import RequestForm from "./pages/RequestForm.tsx";
import NotificationCenter from "./pages/NotificationCenter.tsx";
import AssetManagement from "./pages/AssetManagement.tsx";
import NotFound from "./pages/NotFound.tsx";

import Dashboard from "./pages/Dashboard.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/board" element={<TechnicianBoard />} />
          <Route path="/assets" element={<AssetManagement />} />
          <Route path="/request" element={<RequestForm />} />
          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/assessment/:id" element={<AssessmentForm />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
