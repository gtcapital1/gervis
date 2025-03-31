import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useEffect } from "react";

type ProtectedRouteProps = {
  path: string;
  component: () => React.ReactNode;
};

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  console.log("[DEBUG] ProtectedRoute - Path:", path);
  console.log("[DEBUG] ProtectedRoute - User:", user);
  console.log("[DEBUG] ProtectedRoute - IsLoading:", isLoading);

  useEffect(() => {
    console.log("[DEBUG] ProtectedRoute - Effect triggered");
    console.log("[DEBUG] ProtectedRoute - Current user state:", user);
  }, [user]);

  if (isLoading) {
    console.log("[DEBUG] ProtectedRoute - Loading state, showing loader");
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    console.log("[DEBUG] ProtectedRoute - No user, redirecting to /auth");
    return <Redirect to="/auth" />;
  }

  console.log("[DEBUG] ProtectedRoute - User authenticated, rendering component");
  return <Route path={path} component={Component} />;
}