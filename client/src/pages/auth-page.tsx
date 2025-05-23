import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { VerificationAlert } from "@/components/VerificationAlert";
import { PinVerificationDialog } from "@/components/PinVerificationDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { httpRequest } from "@/lib/queryClient";

// Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Form schemas
// Schemi con traduzioni - vengono creati nella funzione AuthPage
let loginSchema: any;
let registerSchema: any;

type LoginFormValues = {
  email: string;
  password: string;
};

type RegisterFormValues = {
  firstName: string;
  lastName: string;
  company: string;
  isIndependent: boolean;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  username?: string;
};

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { loginMutation, registerMutation, user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { t } = useTranslation();
  const [verifyPinDialogOpen, setVerifyPinDialogOpen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSubmittingForgotPassword, setIsSubmittingForgotPassword] = useState(false);
  
  // Definiamo gli schemi di validazione con le traduzioni
  loginSchema = z.object({
    email: z.string().email({
      message: t('auth.validation.email_invalid'),
    }),
    password: z.string().min(6, {
      message: t('auth.validation.password_length'),
    }),
  });
  
  registerSchema = z.object({
    firstName: z.string().min(1, {
      message: t('auth.validation.first_name_required'),
    }),
    lastName: z.string().min(1, {
      message: t('auth.validation.last_name_required'),
    }),
    company: z.string(),
    isIndependent: z.boolean().default(false),
    email: z.string().email({
      message: t('auth.validation.email_invalid'),
    }),
    phone: z.string().optional(),
    password: z.string().min(6, {
      message: t('auth.validation.password_length'),
    }),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.validation.passwords_dont_match'),
    path: ["confirmPassword"],
  }).refine((data) => data.isIndependent || (data.company && data.company.length > 0), {
    message: t('auth.company_validation_error'),
    path: ["company"],
  });

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      company: "",
      isIndependent: false,
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  // Form per il recupero password
  const forgotPasswordForm = useForm<{ email: string }>({
    resolver: zodResolver(z.object({
      email: z.string().email({
        message: t('auth.validation.email_invalid'),
      }),
    })),
    defaultValues: {
      email: "",
    },
  });

  // Funzione per gestire la verifica PIN completata con successo
  const handleVerificationSuccess = () => {
    toast({
      title: "Verifica completata",
      description: "Email verificata con successo. Ora puoi accedere a tutte le funzionalità.",
    });
    
    setVerifyPinDialogOpen(false);
    setNeedsVerification(false);
    
    // Ricarica la pagina per aggiornare lo stato dell'utente
    window.location.reload();
  };

  // Se l'utente è già loggato e verificato, reindirizza alla dashboard
  if (user && user.isEmailVerified) {
    navigate("/agent");
    return null;
  }
  
  // Se l'utente è loggato ma non verificato, mostra la schermata di verifica
  if (user && !user.isEmailVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Verifica la tua email</CardTitle>
            <CardDescription>
              Prima di continuare, devi verificare il tuo indirizzo email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Email non verificata</AlertTitle>
              <AlertDescription>
                Abbiamo inviato un codice PIN di 4 cifre all'indirizzo {user.email}.
                Inserisci il codice per completare la verifica.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => setVerifyPinDialogOpen(true)}
                className="w-full"
              >
                Inserisci PIN di verifica
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <PinVerificationDialog
          open={verifyPinDialogOpen}
          email={user.email}
          onSuccess={handleVerificationSuccess}
          onClose={() => setVerifyPinDialogOpen(false)}
        />
      </div>
    );
  }
  
  // Se l'utente non è loggato ma abbiamo ricevuto un invito alla verifica, mostra la schermata di verifica
  if (needsVerification && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Verifica la tua email</CardTitle>
            <CardDescription>
              Prima di continuare, devi verificare il tuo indirizzo email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Email non verificata</AlertTitle>
              <AlertDescription>
                Abbiamo inviato un codice PIN di 4 cifre all'indirizzo {registeredEmail}.
                Inserisci il codice per completare la verifica.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => setVerifyPinDialogOpen(true)}
                className="w-full"
              >
                Inserisci PIN di verifica
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setNeedsVerification(false);
                  loginMutation.reset();
                  registerMutation.reset();
                  setActiveTab("login");
                }}
                className="w-full"
              >
                Torna alla pagina di login
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <PinVerificationDialog
          open={verifyPinDialogOpen}
          email={registeredEmail}
          onSuccess={handleVerificationSuccess}
          onClose={() => setVerifyPinDialogOpen(false)}
        />
      </div>
    );
  }

  function onLoginSubmit(data: LoginFormValues) {
    try {
      // Prima di inviare i dati, verifichiamo che siano validi
      if (!data.email || !data.password) {
        toast({
          title: "Login fallito",
          description: "Email e password sono obbligatori",
          variant: "destructive",
        });
        return;
      }
      
      // Log per debug
      
      
      loginMutation.mutate({ 
        email: data.email, 
        password: data.password 
      }, {
        onSuccess: (response) => {
          
          
          // Controlla se l'utente necessita di verifica
          if (response.message && response.message.includes("non verificata") || response.needsVerification) {
            // Salva l'email per la verifica
            setRegisteredEmail(data.email);
            setNeedsVerification(true);
            setVerifyPinDialogOpen(true);
            
            toast({
              title: "Verifica richiesta",
              description: "Per favore, verifica il tuo indirizzo email inserendo il PIN che ti abbiamo inviato.",
            });
          } else {
            toast({
              title: "Login effettuato",
              description: "Bentornato!",
            });
            navigate("/agent");
          }
        },
        onError: (error: any) => {
          
          
          // Se l'errore contiene informazioni sulla necessità di verifica
          if (error.status === 403 && error.data?.needsVerification) {
            setRegisteredEmail(data.email);
            setNeedsVerification(true);
            setVerifyPinDialogOpen(true);
            
            toast({
              title: "Verifica richiesta",
              description: "Per favore, verifica il tuo indirizzo email inserendo il PIN che ti abbiamo inviato.",
            });
          } 
          // Se l'utente è in attesa di approvazione
          else if (error.status === 403 && error.data?.pendingApproval) {
            toast({
              title: "Account in attesa",
              description: "In attesa di approvazione da parte del management di Gervis",
              variant: "default",
            });
          }
          // Gestione specifica per errori di autenticazione (401)
          else if (error.status === 401) {
            toast({
              title: "Login fallito",
              description: error.data?.message || "Credenziali non valide. Verifica email e password.",
              variant: "destructive",
            });
          }
          else {
            toast({
              title: "Login fallito",
              description: error.data?.message || error.message || "Si è verificato un errore durante il login. Riprova più tardi.",
              variant: "destructive",
            });
          }
        },
      });
    } catch (error) {
      
      toast({
        title: "Errore imprevisto",
        description: "Si è verificato un errore imprevisto. Riprova più tardi.",
        variant: "destructive",
      });
    }
  }

  function onRegisterSubmit(data: RegisterFormValues) {
    try {
      // Prima di inviare i dati, verifichiamo che siano validi
      if (!data.email || !data.password || !data.firstName || !data.lastName) {
        toast({
          title: "Registrazione fallita",
          description: "Tutti i campi obbligatori devono essere compilati",
          variant: "destructive",
        });
        return;
      }
      
      // Verifica che le password coincidano
      if (data.password !== data.confirmPassword) {
        toast({
          title: "Registrazione fallita",
          description: "Le password non coincidono",
          variant: "destructive",
        });
        return;
      }
      
      const { confirmPassword, ...userData } = data;
      
      // Log per debug
      console.log("Tentativo di registrazione:", {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isIndependent: userData.isIndependent,
        passwordLength: userData.password.length
      });
      
      // Add a username (it will be overwritten in the backend, but we need it to satisfy the schema)
      const userDataWithUsername = {
        ...userData,
        username: `${userData.firstName.toLowerCase()}.${userData.lastName.toLowerCase()}`
      };
      
      registerMutation.mutate({
        email: userData.email,
        password: userData.password,
        username: userDataWithUsername.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        company: userData.company,
        isIndependent: userData.isIndependent,
        phone: userData.phone
      }, {
        onSuccess: (response) => {
          
          
          // Se la registrazione richiede la verifica del PIN
          if (response.message && response.message.includes("PIN")) {
            setRegisteredEmail(userData.email);
            setNeedsVerification(true);
            setVerifyPinDialogOpen(true);
            
            toast({
              title: "Registrazione effettuata",
              description: "Ti abbiamo inviato un PIN di verifica via email. Inseriscilo per completare la registrazione.",
            });
          } else {
            toast({
              title: "Registrazione completata",
              description: "Il tuo account è stato creato con successo.",
            });
            navigate("/agent");
          }
        },
        onError: (error: any) => {
          console.error("Errore registrazione:", error);
          
          // Verifica se l'errore contiene informazioni dettagliate dalla risposta del server
          if (error.data && error.data.error === "email_already_registered") {
            toast({
              title: "Registrazione fallita",
              description: error.data.message || "Questa email è già registrata. Prova ad effettuare il login o recupera la password.",
              variant: "destructive",
            });
          } else if (error.data && error.data.message) {
            // Mostra il messaggio di errore specifico dal server
            toast({
              title: "Registrazione fallita",
              description: error.data.message,
              variant: "destructive",
            });
          } else if (error.message && (
            error.message.includes("email già registrata") || 
            error.message.includes("email potrebbe essere già registrata") ||
            error.message.toLowerCase().includes("email already"))) {
            // Messaggio specifico per email già registrata
            toast({
              title: "Email già registrata",
              description: "Questa email è già registrata. Prova ad effettuare il login o recupera la password.",
              variant: "destructive",
            });
          } else {
            // Fallback al messaggio di errore generico
            toast({
              title: "Registrazione fallita",
              description: error.message || "Si è verificato un errore durante la registrazione. Riprova.",
              variant: "destructive",
            });
          }
        }
      });
    } catch (error) {
      
      toast({
        title: "Errore imprevisto",
        description: "Si è verificato un errore imprevisto. Riprova più tardi.",
        variant: "destructive",
      });
    }
  }

  // Funzione per gestire la richiesta di recupero password
  async function onForgotPasswordSubmit(data: { email: string }) {
    try {
      setIsSubmittingForgotPassword(true);
      
      const response = await httpRequest("POST", "/api/forgot-password", { email: data.email });
      
      toast({
        title: "Email inviata",
        description: "Se l'email è registrata, riceverai un link per reimpostare la password",
      });
      
      // Resetta il form e torna alla schermata di login
      forgotPasswordForm.reset();
      setShowForgotPassword(false);
      
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio dell'email. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingForgotPassword(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Back button and Language Switcher */}
      <div className="p-4 flex justify-between items-center">
        <Link href="/">
          <Button variant="ghost" className="flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            {t('auth.back_to_home')}
          </Button>
        </Link>
        <LanguageSwitcher />
      </div>
      
      {/* Form Section */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {showForgotPassword ? (
            <Card>
              <CardHeader>
                <CardTitle>Recupera Password</CardTitle>
                <CardDescription>Inserisci la tua email per ricevere un link di recupero password</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...forgotPasswordForm}>
                  <form
                    onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={forgotPasswordForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Inserisci la tua email..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmittingForgotPassword}
                    >
                      {isSubmittingForgotPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Invio in corso...
                        </>
                      ) : (
                        "Invia link di recupero"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full mt-2"
                      onClick={() => setShowForgotPassword(false)}
                    >
                      Torna al login
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
                <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
              </TabsList>
              <div className="mt-6">
                <TabsContent value="login">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('auth.welcome_back')}</CardTitle>
                      <CardDescription>{t('auth.login_description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...loginForm}>
                        <form
                          onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                          className="space-y-4"
                        >
                          <FormField
                            control={loginForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="Email..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('auth.password')}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    placeholder={`${t('auth.password')}...`}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={loginMutation.isPending}
                          >
                            {loginMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('auth.login')}...
                              </>
                            ) : (
                              t('auth.login')
                            )}
                          </Button>
                          <div className="text-center mt-2">
                            <Button
                              variant="link"
                              type="button"
                              className="text-sm"
                              onClick={() => setShowForgotPassword(true)}
                            >
                              Password dimenticata?
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                    <CardFooter className="flex flex-col items-center">
                      <div className="text-sm text-muted-foreground mt-2">
                        {t('auth.no_account')}{" "}
                        <Button
                          variant="link"
                          className="p-0"
                          onClick={() => setActiveTab("register")}
                        >
                          {t('auth.register')}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </TabsContent>
                <TabsContent value="register">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('auth.register_title')}</CardTitle>
                      <CardDescription>{t('auth.register_description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...registerForm}>
                        <form
                          onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                          className="space-y-4"
                        >
                          <FormField
                            control={registerForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('onboarding.first_name')}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={`${t('onboarding.first_name')}...`}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('onboarding.last_name')}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={`${t('onboarding.last_name')}...`}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="company"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('contact.form.company')}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={`${t('contact.form.company')}...`}
                                    disabled={registerForm.watch("isIndependent")}
                                    {...field}
                                    onChange={(e) => {
                                      if (!registerForm.watch("isIndependent")) {
                                        field.onChange(e);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="isIndependent"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      if (checked) {
                                        registerForm.setValue("company", "");
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>
                                    {t('auth.independent_advisor')}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('onboarding.email')}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="Email..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('onboarding.phone')}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={`${t('onboarding.phone')}...`}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('auth.password')}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    placeholder={`${t('auth.password')}...`}
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs mt-1">
                                  La password deve contenere almeno 8 caratteri, una lettera maiuscola, una lettera minuscola, un numero e un carattere speciale.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('auth.confirm_password')}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    placeholder={t('auth.confirm_password_placeholder')}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('auth.register')}...
                              </>
                            ) : (
                              t('auth.register')
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                    <CardFooter className="flex flex-col items-center">
                      <div className="text-sm text-muted-foreground mt-2">
                        {t('auth.have_account')}{" "}
                        <Button
                          variant="link"
                          className="p-0"
                          onClick={() => setActiveTab("login")}
                        >
                          {t('auth.login')}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </div>
      
      {/* Finestra di dialogo per la verifica del PIN */}
      <PinVerificationDialog
        open={verifyPinDialogOpen}
        email={registeredEmail}
        onSuccess={handleVerificationSuccess}
        onClose={() => setVerifyPinDialogOpen(false)}
      />
    </div>
  );
}