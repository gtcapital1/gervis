import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

export default function OnboardingSuccess() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  
  // Verifica lo stato di completamento dell'onboarding
  const { isLoading, isError } = useQuery({
    queryKey: ['/api/onboarding/success'],
    queryFn: async () => {
      try {
        return await apiRequest('/api/onboarding/success');
      } catch (error) {
        // Se c'è un errore 404, significa che l'utente non ha completato l'onboarding
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Invalid or expired token');
        }
        throw error;
      }
    },
    retry: false
  });
  
  // Reindirizza alla home dopo 5 secondi in caso di errore
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isError) {
      timer = setTimeout(() => {
        setLocation('/');
      }, 5000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isError, setLocation]);
  
  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto py-20 px-4 sm:px-6">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Verifying Completion</CardTitle>
            <CardDescription>
              Please wait while we verify your onboarding status...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="container max-w-3xl mx-auto py-20 px-4 sm:px-6">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Invalid Session</CardTitle>
            <CardDescription>
              There was a problem verifying your onboarding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                <p className="mt-2">
                  {error || 'Invalid or expired session. Please contact your financial advisor.'}
                </p>
                <p className="mt-4">
                  You will be redirected to the home page in a few seconds.
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={() => setLocation("/")}
            >
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-3xl mx-auto py-20 px-4 sm:px-6">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Onboarding Complete</CardTitle>
          <CardDescription>
            Thank you for completing the onboarding process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Check className="h-4 w-4 text-green-500" />
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
              <p className="mt-2">
                You have successfully completed the onboarding process. Your financial advisor 
                will review your information and will be in touch with you soon to discuss 
                your investment strategy.
              </p>
              <p className="mt-4">
                If you have any questions or need to make changes to the information you provided,
                please contact your financial advisor directly.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full"
            onClick={() => setLocation("/")}
          >
            Return to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}