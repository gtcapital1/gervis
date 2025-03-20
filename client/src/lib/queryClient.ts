import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Funzione helper per verificare se una risposta è valida
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Gestione degli errori di risposta
    try {
      const errorData = await res.json();
      const error: any = new Error(errorData.message || `${res.status}: Errore`);
      error.status = res.status;
      error.data = errorData;
      throw error;
    } catch (jsonError) {
      // Se non è JSON valido, controlla se è HTML
      try {
        const text = await res.text();
        if (text.trim().toLowerCase().startsWith('<!doctype') || 
            text.trim().toLowerCase().startsWith('<html')) {
          console.error("DIAGNOSI ERRORE: Il server ha restituito HTML invece di JSON");
          console.error(`Status: ${res.status}, URL: ${res.url}`);
          console.error(`Contenuto HTML (primi 200 caratteri): ${text.substring(0, 200)}`);
          throw new Error(`Il server ha restituito HTML invece di JSON. Status: ${res.status}`);
        } else {
          throw new Error(`${res.status}: ${text || res.statusText}`);
        }
      } catch (textError) {
        throw new Error(`${res.status}: Errore nel processare la risposta`);
      }
    }
  }
}

// Funzione principale per le richieste API
export async function apiRequest(url: string, options?: RequestInit): Promise<any> {
  try {
    // Aggiungiamo timestamp per evitare caching
    const urlWithTimestamp = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    
    // Debug richiesta
    console.log(`[API] Richiesta: ${options?.method || 'GET'} ${urlWithTimestamp}`);
    
    // Opzioni della richiesta con anti-cache headers
    const requestOptions: RequestInit = {
      headers: {
        "Accept": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        ...(options?.body ? { "Content-Type": "application/json" } : {})
      },
      credentials: "include",
      ...options
    };
    
    // Esecuzione della richiesta
    const res = await fetch(urlWithTimestamp, requestOptions);
    
    // Verifica risposta valida
    await throwIfResNotOk(res);
    
    // Gestione risposta vuota
    if (res.status === 204) {
      return null; // No content
    }
    
    // Parsing risposta come JSON
    return await res.json();
  } catch (error) {
    // Log dettagliato dell'errore
    console.error(`[API] Errore nella richiesta ${options?.method || 'GET'} ${url}:`, error);
    
    // Aggiunta diagnostica speciale per errori di parsing HTML
    if (error instanceof Error && 
        error.message && 
        error.message.includes('HTML invece di JSON')) {
      console.error('================== DIAGNOSTICA ERRORE ==================');
      console.error('RILEVATO HTML NELLA RISPOSTA API - Timestamp:', new Date().toISOString());
      console.error('Questo può indicare:');
      console.error('1. Sessione scaduta/logout forzato');
      console.error('2. Errore 500 nel server');
      console.error('3. Problema nella configurazione routing');
      console.error('4. Interferenza proxy/cache');
      console.error('=====================================================');
    }
    
    throw error;
  }
}

// Helper per richieste HTTP tipizzate
export async function httpRequest<T = any>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  data?: any
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate"
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

  return apiRequest(url, options) as Promise<T>;
}

// Configurazione per il comportamento in caso di risposta 401
type UnauthorizedBehavior = "returnNull" | "throw";

// Factory per funzione di query
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        "Accept": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Istanza del QueryClient con configurazioni predefinite
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