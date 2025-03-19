import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorData;
    let errorMessage = "";
    
    try {
      // Clone della risposta per evitare il consumo del body
      const resClone = res.clone();
      
      // Prova a interpretare la risposta come JSON
      try {
        errorData = await resClone.json();
        errorMessage = errorData.message || `${res.status}: Errore`;
      } catch (jsonError) {
        // Se non è un JSON valido, usa il testo raw
        const text = await res.text() || res.statusText;
        errorMessage = `${res.status}: ${text}`;
      }
    } catch (e) {
      // Fallback nel caso in cui entrambi i tentativi falliscano
      errorMessage = `${res.status}: Errore nel processare la risposta`;
    }
    
    // Crea un errore con i dettagli della risposta
    const error: any = new Error(errorMessage);
    error.status = res.status;
    if (errorData) error.data = errorData;
    throw error;
  }
}

// Simple function to perform API requests
export async function apiRequest(url: string, options?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    headers: options?.body ? { "Content-Type": "application/json" } : {},
    credentials: "include",
    ...options,
  });

  await throwIfResNotOk(res);
  if (res.status === 204) {
    return null; // No content
  }
  return await res.json();
}

// Helper function to perform HTTP requests with method and data
export async function httpRequest<T = any>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  data?: any
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    credentials: "include",
  };

  if (data) {
    try {
      options.body = JSON.stringify(data);
    } catch (error) {
      console.error("Errore nella serializzazione JSON:", error);
      throw new Error("Impossibile processare i dati della richiesta");
    }
  }

  try {
    return apiRequest(url, options) as Promise<T>;
  } catch (error) {
    console.error(`Errore nella richiesta ${method} a ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});