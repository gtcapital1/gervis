import { createContext, ReactNode, useContext } from "react";
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
  const {
    data,
    error,
    isLoading,
  } = useQuery<{ success: boolean; user: SelectUser } | null, Error>({
    queryKey: ["/api/user"],
    refetchOnWindowFocus: true,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginData) => 
      httpRequest("POST", "/api/login", credentials),
    onSuccess: (data: { success: boolean; user: SelectUser; message?: string; needsVerification?: boolean }) => {
      queryClient.setQueryData(["/api/user"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (userData: InsertUser) => 
      httpRequest("POST", "/api/register", userData),
    onSuccess: (data: { success: boolean; user: SelectUser; message?: string; needsPinVerification?: boolean }) => {
      queryClient.setQueryData(["/api/user"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
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