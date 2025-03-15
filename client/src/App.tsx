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
import { Layout } from "@/components/advisor/Layout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/app">
        {() => (
          <Layout>
            <Dashboard />
          </Layout>
        )}
      </Route>
      <Route path="/clients/:id">
        {(params) => (
          <Layout>
            <ClientDetail />
          </Layout>
        )}
      </Route>
      <Route path="/onboarding/:token" component={OnboardingForm} />
      <Route path="/onboarding/success" component={OnboardingSuccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
