import { Calendar, FileDown, Trash } from "lucide-react";
import { useTranslation } from "react-i18next";

import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPercent } from "@/lib/utils";

interface ISINProduct {
  id: number;
  isin: string;
  name: string;
  category: string;
  description?: string;
  entry_cost: number;
  exit_cost: number;
  ongoing_cost: number;
  transaction_cost?: number;
  performance_fee?: number;
  benchmark?: string | null;
  dividend_policy?: string | null;
  currency?: string | null;
  sri_risk?: number | null;
  recommended_holding_period?: string | null;
  target_market?: string | null;
  kid_file_path?: string;
  createdAt: string;
}

interface ProductCardProps {
  product: ISINProduct;
  onViewProduct: (product: ISINProduct) => void;
  onDownloadKID: (productId: number) => void;
  onDeleteProduct: (productId: number) => void;
  calculateTotalCost: (product: ISINProduct) => number;
}

export default function ProductCard({ 
  product, 
  onViewProduct, 
  onDownloadKID, 
  onDeleteProduct, 
  calculateTotalCost 
}: ProductCardProps) {
  const { t } = useTranslation();

  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer border border-muted"
      onClick={() => onViewProduct(product)}
    >
      <CardHeader className="pb-2 space-y-1">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-medium line-clamp-1">{product.name}</CardTitle>
          <Badge variant="outline" className="text-xs capitalize whitespace-nowrap">
            {t(`asset_categories.${product.category}`)}
          </Badge>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          {product.isin}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="text-sm line-clamp-2 text-muted-foreground mb-4 min-h-[40px]">
          {product.description || t('portfolio.no_description')}
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs mt-3">
          <div className="bg-muted/30 rounded-lg p-2">
            <span className="text-muted-foreground block mb-1">{t('portfolio.total_cost')}</span>
            <span className="font-medium text-primary">{formatPercent(calculateTotalCost(product), 2)}</span>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <span className="text-muted-foreground block mb-1">{t('portfolio.risk_indicator')}</span>
            <span className="font-medium">
              {product.sri_risk ? `${product.sri_risk}/7` : "N/D"}
            </span>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <span className="text-muted-foreground block mb-1">{t('portfolio.holding_period')}</span>
            <span className="font-medium truncate">{product.recommended_holding_period || "N/D"}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t flex justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{new Date(product.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex gap-1">
          {product.kid_file_path && (
            <Button 
              variant="ghost" 
              size="icon"
              title={t('portfolio.download_kid')}
              onClick={(e) => {
                e.stopPropagation();
                onDownloadKID(product.id);
              }}
              className="h-8 w-8"
            >
              <FileDown className="h-4 w-4 text-blue-600" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteProduct(product.id);
            }}
            className="h-8 w-8"
          >
            <Trash className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 