import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireGestor?: boolean;
}

export default function ProtectedRoute({ children, requireGestor = false }: ProtectedRouteProps) {
  const { user, isLoading, isGestorOrAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireGestor && !isGestorOrAdmin) {
    return <Navigate to="/apt" replace />;
  }

  return <>{children}</>;
}
