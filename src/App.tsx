import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import APT from "./pages/APT";
import Dashboard from "./pages/Dashboard";
import Checklist from "./pages/Checklist";
import Configuracoes from "./pages/Configuracoes";
import Gerenciamento from "./pages/Gerenciamento";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/apt" replace />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/apt"
              element={
                <ProtectedRoute>
                  <APT />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checklist"
              element={
                <ProtectedRoute>
                  <Checklist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gerenciamento"
              element={
                <ProtectedRoute>
                  <Gerenciamento />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute>
                  <Configuracoes />
                </ProtectedRoute>
              }
            />
            {/* Redirect old backlog URL */}
            <Route path="/backlog" element={<Navigate to="/gerenciamento" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
