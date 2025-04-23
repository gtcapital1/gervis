import React, { useEffect } from "react";
import { Switch, Route, useLocation, Router } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Login from "@/pages/auth-page";
import Dashboard from "@/pages/Dashboard";
import ClientDetail from "@/pages/ClientDetail";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import ClientList from "@/pages/ClientLogs";
import Clients from "@/pages/Clients";
import OnboardingForm from "@/pages/OnboardingForm";
import OnboardingSuccess from "@/pages/OnboardingSuccess";
import Settings from "@/pages/Settings";
import { Layout } from "@/components/dashboard/Layout";
import AdminPanel from "@/pages/AdminPanel";
import Market from "@/pages/MarketUpdate";
import Calendar from './pages/Calendar';
import EditMifidForm from "@/pages/EditMifidForm";
import MobileVerification from "@/pages/MobileVerification";
import OpportunitiesPage from "@/pages/OpportunitiesPage";
import Agent from "@/pages/Agent";
import ResetPasswordPage from "@/pages/reset-password";

// Create ProtectedRoute component here until we can fix the imports
function ProtectedRoute({ children, adminRequired = false }: { children: React.ReactNode, adminRequired?: boolean }) {
  // This is a simplified version that just passes through children for now
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  
  useEffect(() => {
    if (!isLoading && !user) {
      // Se l'utente non è autenticato, reindirizza al login
      navigate('/auth');
    } else if (!isLoading && user && adminRequired && user.role !== 'admin') {
      // Se è richiesto un admin ma l'utente non lo è, reindirizza alla dashboard
      navigate('/dashboard');
    }
  }, [user, isLoading, adminRequired, navigate]);
  
  // Mostra un loader mentre verifica l'autenticazione
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>;
  }
  
  // Se l'utente non è autenticato, non mostrare nulla mentre reindirizza
  if (!user) {
    return null;
  }
  
  // Se tutto è ok, mostra i componenti figli
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <div className="font-sans antialiased">
            <div className="min-h-screen bg-background">
              <Router>
                <Switch>
                  {/* Public routes */}
                  <Route path="/" component={Home} />
                  <Route path="/auth" component={Login} />
                  <Route path="/register" component={Login} />
                  <Route path="/approval-pending" component={Dashboard} />
                  <Route path="/verify-email" component={Login} />
                  <Route path="/reset-password" component={ResetPasswordPage} />
                  <Route path="/onboarding" component={OnboardingForm} />
                  <Route path="/onboarding/success" component={OnboardingSuccess} />
                  <Route path="/privacy-policy" component={Home} />
                  <Route path="/terms-of-service" component={Home} />

                  {/* Mobile verification route */}
                  <Route path="/id/:sessionId" component={MobileVerification} />
                  
                  {/* Dashboard routes */}
                  <Route path="/dashboard">
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  </Route>

                  {/* Add a route for /app that shows the Dashboard */}
                  <Route path="/app">
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  </Route>
                  
                  <Route path="/app/clients/:id">
                    <ProtectedRoute>
                      <Layout>
                        <ClientDetail />
                      </Layout>
                    </ProtectedRoute>
                  </Route>

                  {/* Add route for MIFID editing */}
                  <Route path="/app/clients/:id/edit-mifid">
                    <ProtectedRoute>
                      <Layout>
                        <EditMifidForm />
                      </Layout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/app/clients">
                    <ProtectedRoute>
                      <Layout>
                        <Clients />
                      </Layout>
                    </ProtectedRoute>
                  </Route>
                  
                  {/* Routes for /clients paths (matching Layout links) */}
                  <Route path="/clients/:id">
                    <ProtectedRoute>
                      <Layout>
                        <ClientDetail />
                      </Layout>
                    </ProtectedRoute>
                  </Route>
                  
                  <Route path="/clients">
                    <ProtectedRoute>
                      <Layout>
                        <Clients />
                      </Layout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/app/clientlist">
                    <ProtectedRoute>
                      <Layout>
                        <ClientList />
                      </Layout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/app/settings">
                    <ProtectedRoute>
                      <Layout>
                        <Settings />
                      </Layout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/app/market">
                    <ProtectedRoute>
                      <Layout>
                        <Market />
                      </Layout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/market">
                    <ProtectedRoute>
                      <Layout>
                        <Market />
                      </Layout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/settings">
                    <ProtectedRoute>
                      <Layout>
                        <Settings />
                      </Layout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/admin">
                    <ProtectedRoute adminRequired>
                      <Layout>
                        <AdminPanel />
                      </Layout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/admin-panel">
                    <ProtectedRoute adminRequired>
                      <Layout>
                        <AdminPanel />
                      </Layout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/calendar">
                    <ProtectedRoute>
                      <Layout>
                        <Calendar />
                      </Layout>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/opportunities">
                    <ProtectedRoute>
                      <Layout>
                        <OpportunitiesPage />
                      </Layout>
                    </ProtectedRoute>
                  </Route>
                  
                  <Route path="/agent">
                    <ProtectedRoute>
                      <Layout>
                        <Agent />
                      </Layout>
                    </ProtectedRoute>
                  </Route>
                  
                  <Route path="/agent/chat" />
                  <Route path="/agent/chat/:id" />
                  <Route path="/clients/add" component={Home} />
                  <Route path="/pricing" />
                  <Route path="/feedback" />
                  <Route path="/profile" />
                  <Route path="/marketplace" />
                  <Route path="/marketplace/:id" />
                  <Route path="/agenda" />
                  <Route path="/agenda/:date" />
                  <Route path="/idea-generator" />
                  <Route path="/suitability" />
                  <Route path="/trends" />

                  {/* 404 route */}
                  <Route component={NotFound} />
                </Switch>
              </Router>
              <Toaster />
            </div>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
