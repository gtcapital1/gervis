import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Plus, 
  Trash2,
  Check,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RISK_PROFILES, ASSET_CATEGORIES } from "@shared/schema";

// Define form schema
const onboardingFormSchema = z.object({
  phone: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  taxCode: z.string().min(1, "Tax code or ID is required"),
  riskProfile: z.enum(RISK_PROFILES as [string, ...string[]], {
    required_error: "Please select a risk profile",
  }),
  assets: z.array(
    z.object({
      category: z.enum(ASSET_CATEGORIES as [string, ...string[]], {
        required_error: "Asset category is required",
      }),
      value: z.coerce.number().min(0, "Value must be a positive number"),
      description: z.string().optional(),
    })
  ).min(0)
});

type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export default function OnboardingForm() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  
  // Query client data based on the token
  const { 
    data: client, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: [`/api/onboarding/${token}`],
    enabled: !!token,
    retry: false,
  });
  
  // Set up form with default values
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      phone: "",
      address: "",
      taxCode: "",
      riskProfile: "balanced",
      assets: [
        { category: "cash", value: 0, description: "Cash holdings" }
      ],
    },
  });
  
  // Submit form data
  const submitMutation = useMutation({
    mutationFn: (data: OnboardingFormValues) => {
      return apiRequest(`/api/onboarding/${token}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Onboarding successful",
        description: "Your profile has been updated successfully.",
      });
      
      // Reset form and redirect to success page or login
      setTimeout(() => {
        setLocation("/onboarding/success");
      }, 1500);
    },
    onError: (error) => {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to submit form. Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    },
  });
  
  // Add a new asset field
  function addAsset() {
    const assets = form.getValues().assets || [];
    form.setValue("assets", [
      ...assets, 
      { category: "cash", value: 0, description: "" }
    ]);
  }
  
  // Remove an asset field
  function removeAsset(index: number) {
    const assets = form.getValues().assets;
    if (assets && assets.length > 1) {
      form.setValue(
        "assets", 
        assets.filter((_, i) => i !== index)
      );
    }
  }
  
  // Handle form submission
  async function onSubmit(data: OnboardingFormValues) {
    setSubmitting(true);
    submitMutation.mutate(data);
  }
  
  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto py-10 px-4 sm:px-6">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Loading</CardTitle>
            <CardDescription>
              Please wait while we load your information...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  if (isError || !client) {
    return (
      <div className="container max-w-3xl mx-auto py-10 px-4 sm:px-6">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-destructive">Error</CardTitle>
            <CardDescription>
              Invalid or expired onboarding link. Please contact your financial advisor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Invalid Link</AlertTitle>
              <AlertDescription>
                This onboarding link is not valid or has expired. 
                Please ask your advisor to send you a new link.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (client.isOnboarded) {
    return (
      <div className="container max-w-3xl mx-auto py-10 px-4 sm:px-6">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Already Onboarded</CardTitle>
            <CardDescription>
              You have already completed the onboarding process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Check className="h-4 w-4" />
              <AlertTitle>Already Onboarded</AlertTitle>
              <AlertDescription>
                You have already completed the onboarding process for this account.
                If you need to update your information, please contact your financial advisor.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/")}
              className="w-full"
            >
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-3xl mx-auto py-10 px-4 sm:px-6">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome, {client.name}</CardTitle>
          <CardDescription>
            Please complete this form to finalize your account setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Personal Information</h3>
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter your full address" 
                          className="resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="taxCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID / Tax Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your tax identification number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator className="my-4" />
                
                <h3 className="text-lg font-medium">Investment Profile</h3>
                
                <FormField
                  control={form.control}
                  name="riskProfile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Profile</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your risk tolerance" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="conservative">Conservative</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="growth">Growth</SelectItem>
                          <SelectItem value="aggressive">Aggressive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This helps us tailor investment recommendations to match your risk tolerance.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator className="my-4" />
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Your Assets</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={addAsset}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Asset
                    </Button>
                  </div>
                  
                  {form.watch("assets")?.map((_, index) => (
                    <div key={index} className="space-y-4 p-4 border rounded-md">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Asset {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAsset(index)}
                          disabled={form.watch("assets")?.length <= 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`assets.${index}.category`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select asset type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="real_estate">Real Estate</SelectItem>
                                  <SelectItem value="equity">Equity/Stocks</SelectItem>
                                  <SelectItem value="bonds">Bonds</SelectItem>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`assets.${index}.value`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Value (€)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="0" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name={`assets.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="E.g., Primary residence, Stock portfolio" 
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => setLocation("/")}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-accent hover:bg-accent/90"
                  disabled={submitting || submitMutation.isPending}
                >
                  {submitting || submitMutation.isPending ? "Submitting..." : "Complete Onboarding"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}