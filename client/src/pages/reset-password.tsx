import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, ChevronLeft } from "lucide-react";
import { useLocation, Link } from "wouter";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Schema di validazione per la form di reset
const resetPasswordSchema = z.object({
  password: z.string().min(8, {
    message: "La password deve essere di almeno 8 caratteri",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non coincidono",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Estrai il token dal URL al caricamento della pagina
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    
    if (!tokenParam) {
      setError("Token mancante. Assicurati di utilizzare il link completo inviato via email.");
      return;
    }
    
    setToken(tokenParam);
  }, []);
  
  // Form per il reset della password
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });
  
  // Funzione per gestire il submit del form
  async function onSubmit(data: ResetPasswordFormValues) {
    if (!token) {
      setError("Token mancante. Riprova o richiedi un nuovo link di reset.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      await httpRequest("POST", "/api/reset-password", {
        token,
        password: data.password,
      });
      
      // Reset completato con successo
      setIsSuccess(true);
      form.reset();
      
      toast({
        title: "Password reimpostata",
        description: "La tua password è stata reimpostata con successo. Ora puoi accedere con la nuova password.",
      });
      
      // Redirect al login dopo 3 secondi
      setTimeout(() => {
        navigate("/");
      }, 3000);
      
    } catch (error: any) {
      console.error("Errore ricevuto dal server:", error);
      
      // Gestione errori sempre con toast invece di invalidare il form
      if (error.status === 400) {
        if (error.data?.error === "token_expired") {
          const errorMessage = "Il link di reset è scaduto. Richiedi un nuovo link.";
          toast({
            title: "Errore",
            description: errorMessage,
            variant: "destructive",
          });
        } else if (error.data?.error === "invalid_token") {
          const errorMessage = "Token non valido. Richiedi un nuovo link di reset.";
          toast({
            title: "Errore",
            description: errorMessage,
            variant: "destructive",
          });
        } else if (error.data?.error === "password_requirements_not_met") {
          // Mostra un toast per ogni requisito mancante
          if (error.data?.details?.requirements && Array.isArray(error.data.details.requirements)) {
            toast({
              title: "Password non valida",
              description: "La password non soddisfa i requisiti di sicurezza.",
              variant: "destructive",
            });
            
            // Mostra ogni requisito specifico come messaggio toast separato
            error.data.details.requirements.forEach((requirement: string) => {
              toast({
                description: requirement,
                variant: "destructive",
              });
            });
          } else if (typeof error.data?.message === "string") {
            // Fallback per messaggio di errore generico
            toast({
              title: "Password non valida",
              description: error.data.message,
              variant: "destructive",
            });
          }
        } else if (error.data?.message) {
          // Per altri errori 400, utilizziamo il messaggio specifico
          toast({
            title: "Errore",
            description: error.data.message,
            variant: "destructive",
          });
        } else {
          // Errore generico per 400
          toast({
            title: "Errore",
            description: "Si è verificato un errore durante il reset della password. Riprova.",
            variant: "destructive",
          });
        }
      } else {
        // Errore generico per errori non-400
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante il reset della password. Riprova.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <div className="flex min-h-screen flex-col">
      {/* Back button */}
      <div className="p-4">
        <Link href="/">
          <Button variant="ghost" className="flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Torna alla home
          </Button>
        </Link>
      </div>
      
      {/* Form Section */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Reimposta la tua password</CardTitle>
              <CardDescription>
                Inserisci una nuova password per il tuo account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSuccess ? (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle>Password reimpostata</AlertTitle>
                  <AlertDescription>
                    La tua password è stata reimpostata con successo. Sarai reindirizzato alla pagina di login.
                  </AlertDescription>
                </Alert>
              ) : error ? (
                <Alert className="bg-red-50 border-red-200 mb-4">
                  <AlertTitle>Errore</AlertTitle>
                  <AlertDescription>
                    {error?.includes("non soddisfa i seguenti requisiti") ? (
                      <>
                        {error.split('\n')[0]}
                        <ul className="mt-2 list-disc pl-5 text-sm">
                          {error.split('\n').slice(1).map((req, idx) => (
                            <li key={idx}>{req.replace('- ', '')}</li>
                          ))}
                        </ul>
                      </>
                    ) : error?.includes("non soddisfa i requisiti") ? (
                      <>
                        {error}
                        <ul className="mt-2 list-disc pl-5 text-sm">
                          <li>Almeno 8 caratteri</li>
                          <li>Almeno una lettera maiuscola</li>
                          <li>Almeno una lettera minuscola</li>
                          <li>Almeno un numero</li>
                          <li>Almeno un carattere speciale (!, @, #, $, %, ecc.)</li>
                        </ul>
                      </>
                    ) : (
                      error
                    )}
                  </AlertDescription>
                </Alert>
              ) : !token ? (
                <Alert className="bg-red-50 border-red-200">
                  <AlertTitle>Token mancante</AlertTitle>
                  <AlertDescription>
                    Token di reset non trovato. Assicurati di utilizzare il link completo ricevuto via email.
                  </AlertDescription>
                </Alert>
              ) : (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nuova Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Inserisci la nuova password..."
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs mt-1">
                            La password deve contenere almeno 8 caratteri, una lettera maiuscola, una lettera minuscola, un numero e un carattere speciale (!, @, #, $, %, ecc.).
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
                          <FormLabel>Conferma Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Conferma la nuova password..."
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
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Reimpostazione in corso...
                        </>
                      ) : (
                        "Reimposta Password"
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
            {!isSuccess && (
              <CardFooter className="flex flex-col items-center">
                <div className="text-sm text-muted-foreground mt-2">
                  Hai ricordato la tua password?{" "}
                  <Link href="/">
                    <Button variant="link" className="p-0">
                      Accedi
                    </Button>
                  </Link>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
} 