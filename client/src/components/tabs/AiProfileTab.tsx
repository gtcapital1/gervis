import React from "react";
import { useTranslation } from "react-i18next";
import { AiClientProfile } from "@/components/dashboard/AiClientProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AiProfileTabProps {
  clientId: number;
}

/**
 * Tab del Profilo AI che mostra l'analisi e le raccomandazioni basate su intelligenza artificiale
 * 
 * Questa componente mostra:
 * - Un'analisi del profilo del cliente generata dall'AI
 * - Opportunità di business basate sulle informazioni del cliente
 * - Raccomandazioni personalizzate
 */
export function AiProfileTab({ clientId }: AiProfileTabProps) {
  const { t } = useTranslation();

  return (
    <TabsContent value="ai-profile" className="space-y-6">
      <div className="grid gap-6">
        {/* Sezione Profilo AI */}
        <AiClientProfile clientId={clientId} />
      </div>
    </TabsContent>
  );
} 