import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Lightbulb, TrendingUp, Users, AlertCircle, Bolt } from "lucide-react";
import { Layout } from "@/components/advisor/Layout";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale";

interface SparkPriority {
  id: number;
  clientId: number;
  clientName: string;
  title: string;
  description: string;
  relatedNewsTitle?: string;
  relatedNewsUrl?: string;
  createdAt: string;
  priority: number;
  isNew: boolean;
}

export default function Spark() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Format date based on current language
  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(
      dateObj,
      "d MMMM yyyy", 
      { locale: i18n.language === "it" ? it : enUS }
    );
  };

  // Get priorities from API
  const {
    data: priorities,
    isLoading,
    error,
    refetch
  } = useQuery<SparkPriority[]>({
    queryKey: ["/api/spark/priorities"],
    retry: 1,
  });

  // Generate new priorities
  const generatePriorities = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/spark/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate priorities");
      }
      
      await refetch();
      toast({
        title: t("spark.refresh_success"),
        description: t("spark.refresh_success_message"),
      });
    } catch (err) {
      toast({
        title: t("spark.refresh_error"),
        description: t("spark.refresh_error_message"),
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle refresh button click
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: t("spark.refresh_success"),
        description: t("spark.refresh_success_message"),
      });
    } catch (err) {
      toast({
        title: t("spark.refresh_error"),
        description: t("spark.refresh_error_message"),
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get priority icon based on priority number
  const getPriorityIcon = (priority: number) => {
    switch (priority) {
      case 1:
        return <Bolt className="h-5 w-5 text-red-500" />;
      case 2:
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 3:
        return <TrendingUp className="h-5 w-5 text-yellow-500" />;
      case 4:
        return <Lightbulb className="h-5 w-5 text-green-500" />;
      case 5:
        return <Users className="h-5 w-5 text-blue-500" />;
      default:
        return <Lightbulb className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get priority badge color based on priority number
  const getPriorityBadgeVariant = (priority: number): "outline" | "default" | "secondary" | "destructive" => {
    switch (priority) {
      case 1:
        return "destructive";
      case 2:
        return "destructive";
      case 3:
        return "secondary";
      case 4:
        return "secondary";
      case 5:
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white">{t("spark.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("spark.description")}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {t("spark.refresh")}
          </Button>
        </div>

        <Separator className="mb-6" />

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6 mb-2" />
                  <Skeleton className="h-4 w-4/6" />
                  <div className="mt-4">
                    <Skeleton className="h-5 w-32" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex gap-3 items-start">
                <AlertCircle className="text-red-500 h-5 w-5 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800 dark:text-red-200">
                    {t("spark.error_title")}
                  </h3>
                  <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                    {t("spark.error_message")}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={handleRefresh}
                  >
                    {t("spark.try_again")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : priorities && priorities.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
            {priorities.map((priority, index) => (
              <Card key={priority.id} className={`overflow-hidden ${priority.isNew ? 'border-green-300 dark:border-green-800' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{priority.title}</CardTitle>
                      {priority.isNew && (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                          {t("spark.new")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center">
                      {getPriorityIcon(priority.priority)}
                      <Badge variant={getPriorityBadgeVariant(priority.priority)} className="ml-2">
                        {t("spark.priority")} {priority.priority}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-1">
                    <span className="font-medium text-foreground">{t("spark.client")}: </span> 
                    {priority.clientName}
                  </p>
                  <p className="text-sm mb-4">{priority.description}</p>
                  
                  {priority.relatedNewsTitle && priority.relatedNewsUrl && (
                    <div className="mt-3 p-3 bg-accent/5 rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("spark.related_news")}:
                      </p>
                      <a 
                        href={priority.relatedNewsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {priority.relatedNewsTitle}
                      </a>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-4">
                    {t("spark.created")}: {formatDate(priority.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Lightbulb className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-1">
                  {t("spark.no_priorities_title")}
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  {t("spark.no_priorities_message")}
                </p>
                <Button onClick={generatePriorities}>
                  {t("spark.generate_priorities")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}