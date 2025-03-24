import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

export default function IdeaDebug() {
  const { t } = useTranslation();
  const [showPrompt, setShowPrompt] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["api/ideas/prompt-debug"],
    enabled: showPrompt, // Carica i dati solo quando richiesto
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Debug Prompt API</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setShowPrompt(true)} 
            disabled={isLoading || showPrompt}
          >
            {isLoading ? "Caricamento..." : "Visualizza Prompt"}
          </Button>
          
          {isError && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Errore</AlertTitle>
              <AlertDescription>
                Si è verificato un errore nel caricamento del prompt.
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="ml-2"
                >
                  Riprova
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isLoading && (
            <div className="mt-4 space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {data && (
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-black">Statistiche Prompt</h3>
                <p className="text-black">Lunghezza totale caratteri: {data?.promptLength}</p>
                <p className="text-black">Token stimati (approx): {data?.estimatedTokens}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-black">Contenuto Prompt</h3>
                <div className="bg-white p-4 rounded-md overflow-auto max-h-[600px] border border-gray-200">
                  <pre className="text-xs whitespace-pre-wrap text-black">{data?.prompt}</pre>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}