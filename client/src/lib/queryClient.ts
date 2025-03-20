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
  try {
    const res = await fetch(url, {
      headers: options?.body ? { "Content-Type": "application/json", "Accept": "application/json" } : { "Accept": "application/json" },
      credentials: "include",
      ...options,
    });

    // Per il metodo DELETE, gestione speciale per l'errore HTML
    if (options?.method === 'DELETE' && !res.ok) {
      try {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          console.error(`DELETE request returned HTML instead of JSON. Status: ${res.status}`);
          console.error(`Request URL: ${url}`);
          // Lanciamo un errore che sarà più comprensibile per l'utente
          throw new Error(`Error ${res.status}: Server returned HTML. Server configuration issue detected.`);
        }
      } catch (htmlError) {
        throw htmlError; // Rilanciamo l'errore per la gestione standard
      }
    }

    await throwIfResNotOk(res);
    if (res.status === 204) {
      return null; // No content
    }
    return await res.json();
  } catch (error) {
    console.error(`API Request Error (${options?.method || 'GET'} ${url}):`, error);
    throw error;
  }
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