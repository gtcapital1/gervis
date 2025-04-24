import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/dashboard/Layout";
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
import { useTheme } from "@/hooks/use-theme";
import { PageHeader } from "@/components/ui/page-header";
import { Checkbox } from "@/components/ui/checkbox";

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

// Schema per le impostazioni email
const emailSettingsFormSchema = z.object({
  smtpHost: z.string(),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpUser: z.string(),
  smtpPass: z.string(),
  customEmailEnabled: z.boolean().default(false)
})
.refine(data => {
  // Se customEmailEnabled è true, allora tutti i campi SMTP sono obbligatori
  if (data.customEmailEnabled) {
    return !!data.smtpHost && !!data.smtpPort && !!data.smtpUser && !!data.smtpPass;
  }
  // Se customEmailEnabled è false, allora non importa se i campi SMTP sono vuoti
  return true;
}, {
  message: "I campi SMTP sono obbligatori quando il server email personalizzato è abilitato",
  path: ["smtpHost"] // mostra il messaggio di errore nel campo smtpHost
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;
type SignatureFormValues = z.infer<typeof signatureFormSchema>;
type CompanyLogoFormValues = z.infer<typeof companyLogoFormSchema>;
type CompanyInfoFormValues = z.infer<typeof companyInfoFormSchema>;
type EmailSettingsFormValues = z.infer<typeof emailSettingsFormSchema>;

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [savedEmailSettings, setSavedEmailSettings] = useState<{custom_email_enabled: boolean}>({
    custom_email_enabled: false
  });
  
  // Riferimento alla sezione email per lo scroll
  const emailSectionRef = useRef<HTMLDivElement>(null);
  
  // Verifica se dobbiamo scrollare alla sezione email (da parametro URL)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      
      if (tabParam === 'email' && emailSectionRef.current) {
        // Scroll alla sezione email con un piccolo ritardo per assicurarsi che la pagina sia caricata
        setTimeout(() => {
          emailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, []);
  
  // Form setup with default values
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Email settings form setup
  const emailSettingsForm = useForm<EmailSettingsFormValues>({
    resolver: zodResolver(emailSettingsFormSchema),
    defaultValues: {
      smtpHost: '',
      smtpPort: 465,
      smtpUser: '',
      smtpPass: '',
      customEmailEnabled: false
    }
  });
  
  // Log quando customEmailEnabled cambia di valore
  useEffect(() => {
    const subscription = emailSettingsForm.watch((value, { name }) => {
      if (name === 'customEmailEnabled') {
        console.log("customEmailEnabled changed:", value.customEmailEnabled);
      }
    });
    return () => subscription.unsubscribe();
  }, [emailSettingsForm]);

  // Fetch email settings when component mounts
  useEffect(() => {
    if (user?.id) {
      const fetchEmailSettings = async () => {
        try {
          console.log("Fetching email settings for user:", user.id);
          
          // Utilizziamo solo l'endpoint API corretto
          const response = await apiRequest('/api/user/email-settings');
          console.log("Email settings response:", response);
          
          if (response && response.success && response.emailSettings) {
            console.log("Extracted email settings:", response.emailSettings);
            
            // Estrai valori considerando il formato snake_case
            const smtpHost = response.emailSettings.smtp_host || '';
            const smtpPort = response.emailSettings.smtp_port || 465;
            const smtpUser = response.emailSettings.smtp_user || '';
            const customEmailEnabled = response.emailSettings.custom_email_enabled || false;
            
            console.log("Extracted values:", {
              smtpHost,
              smtpPort,
              smtpUser,
              customEmailEnabled
            });
            
            // Prepara i dati per il form
            const formValues = {
              smtpHost,
              smtpPort: Number(smtpPort),
              smtpUser,
              smtpPass: '', // Per sicurezza, non mostriamo mai la password
              customEmailEnabled: Boolean(customEmailEnabled)
            };
            
            console.log("Setting form values:", formValues);
            
            // Imposta i valori nel form
            emailSettingsForm.reset(formValues);
            setSavedEmailSettings({custom_email_enabled: customEmailEnabled});
          } else {
            console.log("No valid email settings found in response");
          }
        } catch (error) {
          console.error("Errore nel caricamento delle impostazioni email:", error);
        }
      };
      
      fetchEmailSettings();
    }
  }, [user?.id]);

  // Email settings update mutation
  const emailSettingsMutation = useMutation({
    mutationFn: async (data: EmailSettingsFormValues) => {
      console.log("Saving email settings:", data);
      
      // Converti i nomi dei campi da camelCase a snake_case per il server
      const serverData = {
        smtp_host: data.smtpHost,
        smtp_port: data.smtpPort,
        smtp_user: data.smtpUser,
        smtp_pass: data.smtpPass,
        custom_email_enabled: data.customEmailEnabled
      };
      
      console.log("Converted data for server:", serverData);
      
      // Utilizziamo solo l'endpoint API corretto
      try {
        const response = await apiRequest('/api/user/email-settings', {
          method: "POST",
          body: JSON.stringify(serverData)
        });
        console.log("Response from email settings endpoint:", response);
        return response;
      } catch (error) {
        console.error("Error saving email settings:", error);
        throw new Error(error instanceof Error ? error.message : "Impossibile salvare le impostazioni email");
      }
    },
    onSuccess: (data) => {
      console.log("Email settings saved successfully:", data);
      
      // Aggiorna lo stato salvato per riflettere il nuovo valore nel database
      setSavedEmailSettings({
        custom_email_enabled: emailSettingsForm.getValues('customEmailEnabled')
      });
      
      // Messaggio differente in base allo stato di customEmailEnabled
      if (!emailSettingsForm.getValues('customEmailEnabled')) {
        toast({
          title: "Server email personalizzato disattivato",
          description: "Le impostazioni SMTP sono state rimosse con successo",
        });
      } else {
        toast({
          title: "Impostazioni email aggiornate",
          description: "Le impostazioni email sono state aggiornate con successo",
        });
      }
      
      // Clear cache and refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      console.error("Error saving email settings:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare le impostazioni email",
        variant: "destructive",
      });
    }
  });
  
  function onEmailSettingsSubmit(data: EmailSettingsFormValues) {
    console.log("Submitting email settings:", data);
    
    // Se l'opzione customEmailEnabled è disattivata, svuota i campi SMTP
    if (!data.customEmailEnabled) {
      const clearedData = {
        ...data,
        smtpHost: '',
        smtpPort: 465,
        smtpUser: '',
        smtpPass: '',
      };
      emailSettingsMutation.mutate(clearedData);
    } else {
      emailSettingsMutation.mutate(data);
    }
  }
  
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

  // Password form submission handler
  function onSubmit(data: PasswordFormValues) {
    passwordMutation.mutate(data);
  }

  return (
    <div className="container p-4 md:p-8 max-w-6xl mx-auto">
      <div className="space-y-6">
        <PageHeader 
          title={t('dashboard.settings')}
          subtitle={t('settings.settings_description', 'Manage your account settings and preferences.')}
        />
          
        {/* Account Information */}
            <Card>
              <CardHeader>
            <CardTitle>Informazioni Profilo</CardTitle>
                <CardDescription>
              Visualizza le informazioni del tuo profilo
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
                  <h3 className="font-medium">Nome</h3>
                  <p className="text-muted-foreground">{user?.name || "Non specificato"}</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Email</h3>
                  <p className="text-muted-foreground">{user?.email || "Non specificato"}</p>
                    </div>
                    <div>
                  <h3 className="font-medium">Tipo di Account</h3>
                      <p className="text-muted-foreground">
                        {user?.isPro ? (
                          <span className="text-accent font-semibold">Gervis PRO</span>
                        ) : (
                          "Standard"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
        {/* Email Settings Section */}
        <div id="email-settings" ref={emailSectionRef}>
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Impostazioni Email</CardTitle>
                <CardDescription>
                  Configura il tuo server SMTP per l'invio di email personalizzate ai clienti.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(savedEmailSettings.custom_email_enabled) ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                    <h3 className="text-green-800 font-medium mb-2">Server email personalizzato attivo</h3>
                    <p className="text-green-700 text-sm">
                      Il tuo server SMTP personalizzato è configurato e attivo. Le email verranno inviate utilizzando le impostazioni specificate.
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
                    <h3 className="text-amber-800 font-medium mb-2">Configurazione richiesta</h3>
                    <p className="text-amber-700 text-sm">
                      È necessario configurare un server SMTP per poter inviare email ai clienti. 
                      Il sistema non utilizza più un server predefinito. Se non configuri queste impostazioni, 
                      non sarà possibile inviare email ai clienti.
                    </p>
                  </div>
                )}
                
                <Form {...emailSettingsForm}>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const values = emailSettingsForm.getValues();
                    
                    // Se customEmailEnabled è false, bypassa la validazione
                    if (!values.customEmailEnabled) {
                      const clearedData = {
                        ...values,
                        smtpHost: '',
                        smtpPort: 465,
                        smtpUser: '',
                        smtpPass: '',
                      };
                      emailSettingsMutation.mutate(clearedData);
                    } else {
                      // Altrimenti usa la validazione standard
                      emailSettingsForm.handleSubmit(onEmailSettingsSubmit)(e);
                    }
                  }} className="space-y-5">
                    <FormField
                      control={emailSettingsForm.control}
                      name="customEmailEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-white">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                console.log("Checkbox changed to:", checked);
                                field.onChange(checked);
                              }}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Abilita server email personalizzato</FormLabel>
                            <FormDescription>
                              Attiva questa opzione per utilizzare il tuo server SMTP. <span className="font-semibold">Questa impostazione deve essere attivata per inviare email.</span>
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    {/* SMTP Configuration - Only shown when custom email is enabled */}
                    {emailSettingsForm.watch('customEmailEnabled') && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-4">Configurazione Server SMTP</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={emailSettingsForm.control}
                            name="smtpHost"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Host SMTP</FormLabel>
                                <FormControl>
                                  <Input placeholder="es. smtp.example.com" {...field} />
                                </FormControl>
                                <FormDescription>
                                  L'indirizzo del server SMTP (es. smtp.gmail.com)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={emailSettingsForm.control}
                            name="smtpPort"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Porta SMTP</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="465" {...field} />
                                </FormControl>
                                <FormDescription>
                                  La porta del server SMTP (es. 465, 587, 25)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                          <FormField
                            control={emailSettingsForm.control}
                            name="smtpUser"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username SMTP</FormLabel>
                                <FormControl>
                                  <Input placeholder="es. info@example.com" {...field} />
                                </FormControl>
                                <FormDescription>
                                  L'username/email per accedere al server SMTP
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={emailSettingsForm.control}
                            name="smtpPass"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password SMTP</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Password" {...field} />
                                </FormControl>
                                <FormDescription>
                                  La password per accedere al server SMTP
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      <Button 
                        type="submit"
                        disabled={emailSettingsMutation.isPending}
                      >
                        {emailSettingsMutation.isPending ? "Salvando..." : "Salva impostazioni"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
        </div>

          {/* Security Section */}
            <Card>
              <CardHeader>
            <CardTitle>Cambia Password</CardTitle>
                <CardDescription>
              Aggiorna la tua password per mantenere sicuro il tuo account
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
                      <FormLabel>Password attuale</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                          placeholder="Inserisci la tua password attuale"
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
                      <FormLabel>Nuova Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                          placeholder="Inserisci la tua nuova password"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                        La password deve essere lunga almeno 8 caratteri
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
                      <FormLabel>Conferma Nuova Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                          placeholder="Conferma la tua nuova password"
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
                  {passwordMutation.isPending ? "Aggiornando..." : "Aggiorna Password"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
      </div>
      
      {/* Upgrade Dialog */}
      {user && (
        <UpgradeDialog
          open={isUpgradeOpen}
          onOpenChange={setIsUpgradeOpen}
          userId={user.id}
        />
      )}
    </div>
  );
}

function AppSettings() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t('settings.app_settings')}</h3>
        <p className="text-sm text-muted-foreground">{t('settings.app_settings_description')}</p>
      </div>
    </div>
  );
}