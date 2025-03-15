import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import ClientDetail from "@/pages/ClientDetail";
import OnboardingForm from "@/pages/OnboardingForm";
import OnboardingSuccess from "@/pages/OnboardingSuccess";
import AuthPage from "@/pages/auth-page";
import { Layout } from "@/components/advisor/Layout";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute 
        path="/dashboard" 
        component={() => (
          <Layout>
            <Dashboard />
          </Layout>
        )} 
      />
      <ProtectedRoute 
        path="/app" 
        component={() => (
          <Layout>
            <Dashboard />
          </Layout>
        )} 
      />
      <ProtectedRoute 
        path="/clients/:id" 
        component={() => (
          <Layout>
            <ClientDetail />
          </Layout>
        )} 
      />
      <Route path="/onboarding/:token" component={OnboardingForm} />
      <Route path="/onboarding/success" component={OnboardingSuccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
