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

  
  
  

  useEffect(() => {
    
    
  }, [user]);

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

  
  return <Route path={path} component={Component} />;
}