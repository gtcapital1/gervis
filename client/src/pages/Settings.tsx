import { useState, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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

// Signature form schema
const signatureFormSchema = z.object({
  signature: z.string().max(100, {
    message: "Signature should be less than 100 characters",
  }),
});

// Schema per il form del logo aziendale
const companyLogoFormSchema = z.object({
  companyLogo: z.string().optional(),
});

// Schema per le informazioni societarie
const companyInfoFormSchema = z.object({
  companyInfo: z.string().max(1000, {
    message: "Le informazioni societarie devono essere inferiori a 1000 caratteri",
  }),
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;
type SignatureFormValues = z.infer<typeof signatureFormSchema>;
type CompanyLogoFormValues = z.infer<typeof companyLogoFormSchema>;
type CompanyInfoFormValues = z.infer<typeof companyInfoFormSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  
  // Form setup with default values
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Signature form setup
  const signatureForm = useForm<SignatureFormValues>({
    resolver: zodResolver(signatureFormSchema),
    defaultValues: {
      signature: user?.signature || "",
    },
  });
  
  // Company logo form setup
  const logoForm = useForm<CompanyLogoFormValues>({
    resolver: zodResolver(companyLogoFormSchema),
    defaultValues: {
      companyLogo: "",
    },
  });
  
  // Company info form setup
  const companyInfoForm = useForm<CompanyInfoFormValues>({
    resolver: zodResolver(companyInfoFormSchema),
    defaultValues: {
      companyInfo: user?.companyInfo || "",
    },
  });
  
  // Update signature form when user data changes
  useEffect(() => {
    if (user) {
      signatureForm.reset({
        signature: user.signature || "",
      });
      
      companyInfoForm.reset({
        companyInfo: user.companyInfo || "",
      });
      
      // Set preview logo from user data if available
      if (user.companyLogo) {
        setPreviewLogo(user.companyLogo);
      }
    }
  }, [user, signatureForm, companyInfoForm]);

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

  // Signature update mutation
  const signatureMutation = useMutation({
    mutationFn: (data: SignatureFormValues) => {
      return apiRequest(`/api/users/${user?.id}/signature`, {
        method: "POST",
        body: JSON.stringify({
          signature: data.signature,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Signature updated",
        description: "Your signature has been successfully updated",
      });
      // Clear cache and refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update signature",
        variant: "destructive",
      });
    },
  });

  // Password form submission handler
  function onSubmit(data: PasswordFormValues) {
    passwordMutation.mutate(data);
  }
  
  // Signature form submission handler
  function onSignatureSubmit(data: SignatureFormValues) {
    signatureMutation.mutate(data);
  }
  
  // Company logo mutation
  const logoMutation = useMutation({
    mutationFn: (data: CompanyLogoFormValues) => {
      return apiRequest(`/api/users/${user?.id}/company-logo`, {
        method: "POST",
        body: JSON.stringify({
          companyLogo: data.companyLogo,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Logo aggiornato",
        description: "Il logo aziendale è stato aggiornato con successo",
      });
      // Clear cache and refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare il logo aziendale",
        variant: "destructive",
      });
    },
  });
  
  // Handle logo file upload
  function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({
        title: "File troppo grande",
        description: "Il logo deve essere inferiore a 2MB",
        variant: "destructive",
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewLogo(result);
      logoForm.setValue("companyLogo", result);
    };
    reader.readAsDataURL(file);
  }
  
  // Company logo form submission handler
  function onLogoSubmit(data: CompanyLogoFormValues) {
    logoMutation.mutate(data);
  }
  
  // Company info mutation
  const companyInfoMutation = useMutation({
    mutationFn: (data: CompanyInfoFormValues) => {
      return apiRequest(`/api/users/${user?.id}/company-info`, {
        method: "POST",
        body: JSON.stringify({
          companyInfo: data.companyInfo,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Informazioni societarie aggiornate",
        description: "Le informazioni societarie sono state aggiornate con successo",
      });
      // Clear cache and refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare le informazioni societarie",
        variant: "destructive",
      });
    },
  });
  
  // Company info form submission handler
  function onCompanyInfoSubmit(data: CompanyInfoFormValues) {
    companyInfoMutation.mutate(data);
  }

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-6 border-b text-black">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black">Settings</h1>
            <p className="text-gray-600">
              Manage your account settings and preferences
            </p>
          </div>
        </div>
        
        <Separator />
        
        <div className="p-6 space-y-6 max-w-3xl mx-auto w-full">
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
          
          {/* Company Logo Section */}
          <Card>
            <CardHeader>
              <CardTitle>Logo Aziendale</CardTitle>
              <CardDescription>
                Carica il logo della tua azienda da utilizzare nei documenti PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...logoForm}>
                <form onSubmit={logoForm.handleSubmit(onLogoSubmit)} className="space-y-4">
                  <div className="flex flex-col space-y-6">
                    {/* Logo preview */}
                    {previewLogo && (
                      <div className="mb-4">
                        <h3 className="font-medium mb-2">Anteprima Logo</h3>
                        <div className="border rounded-md p-4 flex items-center justify-center bg-gray-50">
                          <img 
                            src={previewLogo} 
                            alt="Company Logo Preview" 
                            className="max-h-[150px] max-w-full object-contain"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Upload input for logo */}
                    <div>
                      <FormLabel>Seleziona file logo (max 2MB)</FormLabel>
                      <div className="mt-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="cursor-pointer"
                        />
                      </div>
                      <FormDescription>
                        Il logo verrà utilizzato come filigrana nell'intestazione dei tuoi documenti PDF
                      </FormDescription>
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={logoMutation.isPending || !previewLogo}
                      className="mt-4"
                    >
                      {logoMutation.isPending ? "Salvando..." : "Salva Logo"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* Company Info Section */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Societarie</CardTitle>
              <CardDescription>
                Inserisci le informazioni societarie che appariranno nei documenti PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...companyInfoForm}>
                <form onSubmit={companyInfoForm.handleSubmit(onCompanyInfoSubmit)} className="space-y-4">
                  <FormField
                    control={companyInfoForm.control}
                    name="companyInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Informazioni societarie</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Inserisci i dettagli della società (indirizzo, telefono, email, P.IVA, ecc.)"
                            {...field}
                            className="min-h-[150px]"
                          />
                        </FormControl>
                        <FormDescription>
                          Queste informazioni appariranno nell'intestazione dei documenti PDF sotto il logo aziendale
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={companyInfoMutation.isPending}
                    className="mt-4"
                  >
                    {companyInfoMutation.isPending ? "Salvando..." : "Salva Informazioni"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* Email Signature Section */}
          <Card>
            <CardHeader>
              <CardTitle>Email Signature</CardTitle>
              <CardDescription>
                Customize your signature for client communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...signatureForm}>
                <form onSubmit={signatureForm.handleSubmit(onSignatureSubmit)} className="space-y-4">
                  <FormField
                    control={signatureForm.control}
                    name="signature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Signature</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your professional signature"
                            {...field}
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormDescription>
                          This signature will appear at the end of all your client communications
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={signatureMutation.isPending}
                    className="mt-4"
                  >
                    {signatureMutation.isPending ? "Saving..." : "Save Signature"}
                  </Button>
                </form>
              </Form>
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