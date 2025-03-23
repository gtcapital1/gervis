import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, CardHeader, CardTitle, CardDescription, 
  CardContent, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Alert, AlertTitle, AlertDescription 
} from "@/components/ui/alert";
import { 
  Trash2, RefreshCw, UserCheck, AlertTriangle, 
  Calendar, Clock, BarChart2, Activity 
} from "lucide-react";
import { 
  HoverCard, HoverCardTrigger, HoverCardContent 
} from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { it, enUS } from "date-fns/locale";

export default function Spark() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  
  // Funzione per ottenere il locale corretto per date-fns
  const getLocale = () => {
    return i18n.language === "it" ? it : enUS;
  };

  // Recupero delle priorità Spark
  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ["/api/spark/priorities"],
    onSuccess: (data) => {
      if (data?.priorities?.length > 0) {
        const latestPriority = data.priorities.reduce((latest, priority) => {
          const currentDate = new Date(priority.createdAt);
          const latestDate = new Date(latest.createdAt);
          return currentDate > latestDate ? priority : latest;
        }, data.priorities[0]);
        
        const formattedDate = formatDistanceToNow(new Date(latestPriority.createdAt), { 
          addSuffix: true,
          locale: getLocale()
        });
        setLastUpdate(formattedDate);
      } else {
        setLastUpdate(null);
      }
    }
  });

  // Mutazione per generare nuove priorità
  const generateMutation = useMutation({
    mutationFn: () => apiRequest("/api/spark/generate", { method: "POST" }),
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spark/priorities"] });
      setTimeout(() => setIsGenerating(false), 500);
    },
    onError: () => {
      setIsGenerating(false);
    }
  });

  // Mutazione per marcare una priorità come letta
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/spark/priorities/${id}/read`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spark/priorities"] });
    }
  });

  // Mutazione per eliminare una priorità
  const deletePriorityMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/spark/priorities/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spark/priorities"] });
    }
  });

  const handleGeneratePriorities = () => {
    generateMutation.mutate();
  };

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const handleDeletePriority = (id: number) => {
    deletePriorityMutation.mutate(id);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("spark.title")}</h1>
          <p className="text-muted-foreground max-w-2xl mt-2">
            {t("spark.description")}
          </p>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground mt-1">
              {t("spark.lastUpdate")}: {lastUpdate}
            </p>
          )}
        </div>
        <Button 
          onClick={handleGeneratePriorities} 
          disabled={isGenerating || isLoading}
          className="flex gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
          {t("spark.generatePriorities")}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full mb-2" />
                <div className="flex justify-between mt-4">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("spark.errorTitle")}</AlertTitle>
          <AlertDescription>
            {t("spark.errorDescription")}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="ml-2"
            >
              {t("spark.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : data?.priorities?.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("spark.noPrioritiesTitle")}</AlertTitle>
          <AlertDescription>
            {t("spark.noPrioritiesDescription")}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data?.priorities?.map((priority) => (
            <Card key={priority.id} className={`overflow-hidden ${priority.isNew ? "border-primary border-2" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg leading-tight">
                    {priority.title}
                    {priority.isNew && (
                      <Badge className="ml-2 bg-primary" variant="default">
                        {t("spark.new")}
                      </Badge>
                    )}
                  </CardTitle>
                </div>
                <CardDescription className="flex items-center gap-1 text-xs mt-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(priority.createdAt).toLocaleDateString()}
                  <Clock className="h-3 w-3 ml-2" />
                  {new Date(priority.createdAt).toLocaleTimeString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {priority.description}
                </p>
                {priority.clientName && (
                  <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                    <UserCheck className="h-4 w-4" />
                    <span>{priority.clientName}</span>
                  </div>
                )}
                {priority.source && (
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground cursor-pointer">
                        <BarChart2 className="h-4 w-4" />
                        <span className="underline">{t("spark.source")}</span>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">{t("spark.sourceDetails")}</h4>
                        <p className="text-sm">{priority.source}</p>
                        {priority.sourceUrl && (
                          <a 
                            href={priority.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            {t("spark.openArticle")} →
                          </a>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                )}
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                {priority.isNew ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleMarkAsRead(priority.id)}
                  >
                    {t("spark.markAsRead")}
                  </Button>
                ) : (
                  <div></div> // Spacer per mantenere il layout
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDeletePriority(priority.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
