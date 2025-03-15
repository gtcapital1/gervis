import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/advisor/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UpgradeDialog } from "@/components/pro/UpgradeDialog";

// Password form schema with validation
const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(6, {
      message: "Current password must be at least 6 characters",
    }),
    newPassword: z.string().min(8, {
      message: "New password must be at least 8 characters",
    }),
    confirmPassword: z.string().min(8, {
      message: "Confirm password must be at least 8 characters",
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  
  // Form setup with default values
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Downgrade to Base plan mutation
  const downgradeMutation = useMutation({
    mutationFn: () => {
      return apiRequest(`/api/users/${user?.id}/downgrade`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Account downgraded",
        description: "Your account has been downgraded to Base successfully.",
      });
      
      // Clear cache and refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Force a page reload to ensure all UI elements update properly
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to downgrade account",
        variant: "destructive",
      });
    },
  });
  
  // Password change mutation
  const passwordMutation = useMutation({
    mutationFn: (data: PasswordFormValues) => {
      return apiRequest(`/api/users/${user?.id}/password`, {
        method: "POST",
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  function onSubmit(data: PasswordFormValues) {
    passwordMutation.mutate(data);
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto w-full">
            <div className="flex flex-col p-6 border-b">
              <h1 className="text-3xl font-bold tracking-tight text-black">Settings</h1>
              <p className="text-muted-foreground mt-2">
                Manage your account settings and preferences
              </p>
            </div>
            
            <div className="space-y-6">
              {/* Account Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    View and update your profile information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium">Username</h3>
                        <p className="text-muted-foreground">{user?.username}</p>
                      </div>
                      <div>
                        <h3 className="font-medium">Name</h3>
                        <p className="text-muted-foreground">{user?.name || "Not provided"}</p>
                      </div>
                      <div>
                        <h3 className="font-medium">Email</h3>
                        <p className="text-muted-foreground">{user?.email || "Not provided"}</p>
                      </div>
                      <div>
                        <h3 className="font-medium">Account Type</h3>
                        <p className="text-muted-foreground">
                          {user?.isPro ? (
                            <span className="text-accent font-semibold">Watson PRO</span>
                          ) : (
                            "Standard"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Security Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter your current password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter your new password"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Password must be at least 8 characters long
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Confirm your new password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        disabled={passwordMutation.isPending}
                        className="mt-4"
                      >
                        {passwordMutation.isPending ? "Updating..." : "Update Password"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              {/* Subscription Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Management</CardTitle>
                  <CardDescription>
                    Manage your subscription and billing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="mb-6">
                      <h3 className="font-medium text-lg">Current Plan</h3>
                      <div className="flex items-center justify-between mt-2 p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">
                            {user?.isPro ? "Watson PRO Plan" : "Standard Plan"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user?.isPro
                              ? "Access to all premium features"
                              : "Basic features only"}
                          </p>
                        </div>
                        {!user?.isPro && (
                          <Button 
                            onClick={() => setIsUpgradeOpen(true)}
                            className="bg-accent hover:bg-accent/90"
                          >
                            Upgrade to Watson PRO
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {user?.isPro && (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-medium text-lg">Premium Features</h3>
                          <Button 
                            variant="outline"
                            onClick={() => downgradeMutation.mutate()}
                            disabled={downgradeMutation.isPending}
                            className="text-red-500 border-red-200 hover:bg-red-50"
                          >
                            {downgradeMutation.isPending ? "Downgrading..." : "Downgrade to Base"}
                          </Button>
                        </div>
                        <ul className="mt-2 space-y-2">
                          <li className="flex items-center">
                            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Advanced financial analytics
                          </li>
                          <li className="flex items-center">
                            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Personalized investment recommendations
                          </li>
                          <li className="flex items-center">
                            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Priority customer support
                          </li>
                          <li className="flex items-center">
                            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Portfolio optimization tools
                          </li>
                        </ul>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Upgrade Dialog */}
      {user && (
        <UpgradeDialog
          open={isUpgradeOpen}
          onOpenChange={setIsUpgradeOpen}
          userId={user.id}
        />
      )}
    </Layout>
  );
}