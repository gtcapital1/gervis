// Shared interfaces for portfolio data

export interface AllocationItem {
  isinId?: number;
  isin?: string;
  name?: string;
  category: string;
  percentage: number;
}

export interface ModelPortfolio {
  id: number;
  name: string;
  description: string;
  clientProfile: string;
  riskLevel: string;
  createdAt: string;
  allocation: AllocationItem[];
  totalAnnualCost?: number;
  averageRisk?: number;
  notes?: string;
  asset_class_distribution?: any;
  average_time_horizon?: number;
  averageInvestmentHorizon?: number;
  construction_logic?: string;
}

export interface ISINProduct {
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