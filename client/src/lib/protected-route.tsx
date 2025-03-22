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

  // Debug per problemi di autenticazione
  useEffect(() => {
    console.log(`[Debug] ProtectedRoute [${path}] - user:`, user ? "autenticato" : "non autenticato", "isLoading:", isLoading);
  }, [user, isLoading, path]);

  return (
    <Route path={path}>
      {() => {
        // Debug add
        console.log(`[Debug] Rendering ProtectedRoute [${path}] - user:`, user ? `autenticato (${user.id})` : "non autenticato", "isLoading:", isLoading);
        
        if (isLoading) {
          return (
            <div className="flex flex-col items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
              <p className="text-md text-muted-foreground">Verifica autenticazione...</p>
            </div>
          );
        }
        
        if (!user) {
          console.log(`[Debug] Redirect a /auth da [${path}] - Utente non autenticato`);
          return <Redirect to="/auth" />;
        }
        
        // Verifica ulteriore dello stato dell'autenticazione
        if (user && user.id) {
          console.log(`[Debug] Accesso consentito a [${path}] per utente ID: ${user.id}`);
          return <Component />;
        } else {
          console.log(`[Debug] Redirect anomalo a /auth da [${path}] - Utente ha dati incompleti`);
          return <Redirect to="/auth" />;
        }
      }}
    </Route>
  );
}