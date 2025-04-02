import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line 
} from "recharts";

export interface TrendData {
  period: string;
  value1: number;
  value2?: number;
  value3?: number;
}

interface DialogTrendProps {
  title: string;
  data: TrendData[];
  valueFormat: (value: number) => string;
  series1Label: string;
  series2Label?: string;
  showValue2?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function DialogTrend({
  title,
  data,
  valueFormat,
  series1Label,
  series2Label = "Value 2",
  showValue2 = false,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  trigger
}: DialogTrendProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Determine if we're using external or internal state
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const onOpenChange = isControlled ? externalOnOpenChange : setInternalOpen;

  // Format the period labels for display
  const formatPeriod = (period: string) => {
    switch (period) {
      case '1w': return '1 Week';
      case '1m': return '1 Month';
      case '3m': return '3 Months';
      case '6m': return '6 Months';
      case '1y': return '1 Year';
      default: return period;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : 
      <DialogTrigger asChild>
        <Button 
          variant="link" 
          className="p-0 text-xs hover:no-underline flex items-center text-muted-foreground"
        >
          <TrendingUp className="h-3 w-3 mr-1" />
          View trend
        </Button>
      </DialogTrigger>}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title} Trend</DialogTitle>
        </DialogHeader>
        <div className="py-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tickFormatter={formatPeriod} 
              />
              <YAxis tickFormatter={valueFormat} />
              <Tooltip 
                formatter={(value: number) => valueFormat(value)}
                labelFormatter={(label) => formatPeriod(label)}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value1" 
                name={series1Label}
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
              />
              {showValue2 && (
                <Line 
                  type="monotone" 
                  dataKey="value2" 
                  name={series2Label}
                  stroke="#82ca9d" 
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
} 