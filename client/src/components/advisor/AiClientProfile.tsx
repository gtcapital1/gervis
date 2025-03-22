import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sparkles, Brain, RefreshCw, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AiClientProfileProps {
  clientId: number;
}

interface ProfileEnrichment {
  approfondimenti: string;
  suggerimenti: string;
}

export function AiClientProfile({ clientId }: AiClientProfileProps) {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ success: boolean; data: ProfileEnrichment }>({
    queryKey: [`/api/ai/client-profile/${clientId}`],
    enabled: !!clientId,
    retry: 1,
  });
  
  const formatText = (text: string | null | undefined) => {
    // Se il testo non esiste, mostra un messaggio di default
    if (!text) return <p className="mb-4 dark:text-white text-gray-800">{t('no_content_available')}</p>;
    
    // Se il testo è un oggetto (potrebbe accadere in caso di errori di parsing JSON)
    if (typeof text !== 'string') {
      return <p className="mb-4 dark:text-white text-gray-800">{t('content_not_formatted_correctly')}</p>;
    }
    
    // Split by newlines and create paragraphs
    try {
      return text.split('\n\n').map((paragraph, index) => (
        <p key={index} className="mb-4 dark:text-white text-gray-800">
          {paragraph}
        </p>
      ));
    } catch (error) {
      console.error("Errore durante la formattazione del testo:", error);
      return <p className="mb-4 dark:text-white text-gray-800">{t('content_not_formatted_correctly')}</p>; // Utilizziamo la chiave di traduzione anche qui
    }
  };
  
  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center dark:text-white text-gray-800">
            <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
            {t('ai_profile')}
          </CardTitle>
          <CardDescription className="dark:text-white/80 text-gray-700">
            {t('ai_profile_generating')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-[150px] w-full dark:bg-gray-700 bg-gray-200" />
          <Skeleton className="h-[150px] w-full dark:bg-gray-700 bg-gray-200" />
        </CardContent>
      </Card>
    );
  }
  
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center dark:text-white text-gray-800">
            <Brain className="mr-2 h-5 w-5 text-purple-500" />
            {t('ai_profile')}
          </CardTitle>
          <CardDescription className="dark:text-white/80 text-gray-700">
            {t('ai_profile_error')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error 
                ? error.message 
                : t('ai_profile_error_generic')}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-6">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="dark:text-white dark:border-gray-600 hover:dark:bg-gray-800"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing 
                ? t('ai_profile_refreshing') 
                : t('ai_profile_refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center dark:text-white text-gray-800">
            <Brain className="mr-2 h-5 w-5 text-purple-500" />
            {t('ai_profile')}
          </CardTitle>
          <CardDescription className="dark:text-white/80 text-gray-700">
            {t('ai_profile_no_data')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <Brain className="h-16 w-16 dark:text-gray-500 text-gray-300" />
            <h3 className="text-lg font-semibold dark:text-white text-gray-800">
              {t('ai_profile_no_data_title')}
            </h3>
            <p className="dark:text-gray-300 text-gray-600 max-w-md">
              {t('ai_profile_no_data_description')}
            </p>
            <Button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="dark:text-white dark:hover:bg-gray-800"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing 
                ? t('ai_profile_generating_now') 
                : t('ai_profile_generate')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
          <CardTitle className="flex items-center dark:text-white text-gray-800">
            <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
            {t('ai_insights')}
          </CardTitle>
          <CardDescription className="dark:text-white/80 text-gray-700">
            {t('ai_insights_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="prose dark:prose-invert max-w-full">
            {formatText(data?.data?.approfondimenti)}
          </div>
        </CardContent>
      </Card>
      
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
          <CardTitle className="flex items-center dark:text-white text-gray-800">
            <Brain className="mr-2 h-5 w-5 text-blue-500" />
            {t('ai_suggestions')}
          </CardTitle>
          <CardDescription className="dark:text-white/80 text-gray-700">
            {t('ai_suggestions_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="prose dark:prose-invert max-w-full">
            {formatText(data?.data?.suggerimenti)}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2 pb-4 text-sm dark:text-gray-300 text-gray-600">
          <div className="flex items-center">
            <Clock className="mr-1 h-3 w-3" />
            {t('ai_last_updated')}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="dark:text-white hover:dark:bg-gray-800"
          >
            <RefreshCw className={`mr-2 h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing 
              ? t('ai_profile_refreshing') 
              : t('ai_profile_refresh')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}