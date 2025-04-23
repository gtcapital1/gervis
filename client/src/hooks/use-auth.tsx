import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { queryClient, httpRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<{ success: boolean; user: SelectUser; message?: string; needsVerification?: boolean }, Error, LoginData>;
  logoutMutation: UseMutationResult<{ success: boolean }, Error, void>;
  registerMutation: UseMutationResult<{ success: boolean; user: SelectUser; message?: string; needsPinVerification?: boolean }, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "email" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  
  // Verifica sessione ogni 20 secondi per debugging (rimuovere in produzione)
  useEffect(() => {
    const checkInterval = setInterval(() => {
      
      fetch('/api/user')
        .then(res => {
          
          return res.json().catch(() => ({ success: false }));
        })
        .then(data => {
          
        })
        .catch(err => {
          
        });
    }, 20000); // Ogni 20 secondi
    
    return () => clearInterval(checkInterval);
  }, []);
  
  // Query per verificare stato di autenticazione
  const {
    data,
    error,
    isLoading,
  } = useQuery<{ success: boolean; user: SelectUser } | null, Error>({
    queryKey: ["/api/user"],
    refetchOnWindowFocus: true,
    retry: 1,  // Aggiungiamo un retry per maggiore resilienza
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginData) => 
      httpRequest("POST", "/api/login", credentials),
    onSuccess: (data: { success: boolean; user: SelectUser; message?: string; needsVerification?: boolean }) => {
      queryClient.setQueryData(["/api/user"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      // Verifica se l'errore contiene informazioni dettagliate
      let title = "Login fallito";
      let description = error.message;
      
      // Gestione specifica per errori conosciuti
      if (error.data) {
        if (error.status === 401) {
          description = error.data.message || "Credenziali non valide. Verifica email e password.";
        } else if (error.data.message) {
          description = error.data.message;
        }
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (userData: InsertUser) => {
      return httpRequest("POST", "/api/register", userData);
    },
    onSuccess: (data: { success: boolean; user: SelectUser; message?: string; needsPinVerification?: boolean }) => {
      queryClient.setQueryData(["/api/user"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      console.error("Errore dettagliato registrazione:", {
        message: error.message,
        data: error.data,
        status: error.status
      });
      
      // Verifica se l'errore contiene informazioni dettagliate
      let title = "Registrazione fallita";
      let description = error.message;
      
      // Gestione specifica per errori conosciuti
      if (error.data) {
        if (error.data.error === "email_already_registered") {
          description = error.data.message || "Questa email è già registrata. Prova ad effettuare il login o recupera la password.";
        } else if (error.data.error === "password_requirements_not_met") {
          description = error.data.message || "La password non soddisfa i requisiti di sicurezza.";
          if (error.data.details?.requirements) {
            description += " " + error.data.details.requirements.join(" ");
          }
        } else if (error.data.message) {
          description = error.data.message;
        }
      }
      
      // Gestione speciale per errori 400 che potrebbero indicare email esistente
      if (error.status === 400 && error.message.includes("Errore nel processare")) {
        description = "Questa email potrebbe essere già registrata. Prova ad effettuare il login o recupera la password.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => httpRequest("POST", "/api/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: data?.user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}