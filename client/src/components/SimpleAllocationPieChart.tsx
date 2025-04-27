import React from 'react';
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';

interface SimpleAllocationPieChartProps {
  // Può accettare diversi formati:
  // 1. Oggetto: { "equity": 60, "bonds": 20, "cash": 10, "real_estate": 10 }
  // 2. Array di oggetti: [{"category": "equity", "percentage": 60}, ...]
  // 3. Stringa JSON di uno dei formati sopra
  allocationData: any;
  getCategoryColor: (category: string) => string;
  height?: number;
}

export default function SimpleAllocationPieChart({
  allocationData,
  getCategoryColor,
  height = 180
}: SimpleAllocationPieChartProps) {
  const { t } = useTranslation();
  
  // Converti qualsiasi formato in un array per recharts
  const data = React.useMemo(() => {
    console.log("DEBUG - SimpleAllocationPieChart - Raw allocation data:", 
      typeof allocationData === 'string' ? allocationData : JSON.stringify(allocationData));
    
    // Gestisci il caso stringa (JSON)
    let processedData = allocationData;
    if (typeof allocationData === 'string') {
      try {
        processedData = JSON.parse(allocationData);
        console.log("DEBUG - SimpleAllocationPieChart - Parsed JSON:", JSON.stringify(processedData));
      } catch (e) {
        console.error("DEBUG - SimpleAllocationPieChart - Failed to parse JSON:", e);
        return [];
      }
    }
    
    // Se non è un dato valido
    if (!processedData) {
      console.log("DEBUG - SimpleAllocationPieChart - No data");
      return [];
    }
    
    // Caso 1: Oggetto semplice { "equity": 60, ... }
    if (typeof processedData === 'object' && !Array.isArray(processedData)) {
      console.log("DEBUG - SimpleAllocationPieChart - Processing object format");
      return Object.entries(processedData).map(([key, value]) => ({
        name: key,
        value: Number(value)
      }));
    }
    
    // Caso 2: Array di oggetti [{"category": "equity", "percentage": 60}, ...]
    if (Array.isArray(processedData) && processedData.length > 0) {
      console.log("DEBUG - SimpleAllocationPieChart - Processing array format");
      
      // Controlla se ha la struttura con category/percentage
      if ('category' in processedData[0] && 'percentage' in processedData[0]) {
        console.log("DEBUG - SimpleAllocationPieChart - Array has category/percentage format");
        return processedData.map(item => ({
          name: item.category,
          value: Number(item.percentage)
        }));
      }
      
      // Altri formati di array non supportati
      console.log("DEBUG - SimpleAllocationPieChart - Unsupported array format");
    }
    
    console.log("DEBUG - SimpleAllocationPieChart - No supported format found");
    return [];
  }, [allocationData]);
  
  console.log("DEBUG - SimpleAllocationPieChart - Final data for chart:", data);
  
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        <div>
          Nessuna allocazione disponibile
          <div className="text-xs mt-1">DEBUG - No allocation data available - Format: {typeof allocationData}</div>
        </div>
      </div>
    );
  }
  
  // Funzione di rendering avanzata per le label
  const renderCustomizedLabel = (props: any) => {
    // Non mostrare più numeri sul grafico
    return null;
  };
  
  return (
    <div style={{ width: '100%', height: Math.max(height, 180) }} className="flex flex-row items-center">
      {/* Grafico a torta (a sinistra) */}
      <div className="flex-1 flex justify-center" style={{ maxWidth: '60%' }}>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={60}
              innerRadius={32}
              paddingAngle={2}
              labelLine={false}
              label={renderCustomizedLabel}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={getCategoryColor(entry.name)}
                  stroke="#fff"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name) => [
                `${value}%`, 
                t(`asset_categories.${name}`)
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legenda personalizzata separata */}
      <div className="flex flex-col justify-center gap-y-2 pl-2 pr-4" style={{ minWidth: '40%' }}>
        {data
          .slice()
          .sort((a, b) => b.value - a.value)
          .map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center">
            <div 
              className="w-3 h-3 mr-2 flex-shrink-0 rounded-sm" 
              style={{ backgroundColor: getCategoryColor(entry.name) }}
            />
            <span className="text-xs truncate">
              {t(`asset_categories.${entry.name}`)} {parseInt(entry.value.toString())}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
} 