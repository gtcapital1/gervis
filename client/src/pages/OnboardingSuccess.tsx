import { useLocation } from "wouter";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function OnboardingSuccess() {
  const [, setLocation] = useLocation();
  
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