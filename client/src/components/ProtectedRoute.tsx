import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  adminRequired?: boolean;
}

export default function ProtectedRoute({ children, adminRequired = false }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Admin check
  if (adminRequired) {
    const isAdmin = user.email === "gianmarco.trapasso@gmail.com" || user.role === "admin";
    if (!isAdmin) {
      return <Redirect to="/dashboard" />;
    }
  }

  return <>{children}</>;
} 