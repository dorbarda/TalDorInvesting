export type TickerStatus = "holding" | "watching" | "passed" | "exited";

export interface Ticker {
  id: string;
  symbol: string;
  company_name: string;
  status: TickerStatus;
  confidence_score: number | null;
  price_score: number | null;
  five_pillars_score: number | null;
  last_earnings_date: string | null;
  next_earnings_date: string | null;
  current_price: number | null;
  price_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Writeup {
  id: string;
  ticker_id: string;
  title: string;
  content_md: string;
  version: number;
  created_at: string;
}

export interface Attachment {
  id: string;
  ticker_id: string;
  filename: string;
  storage_path: string;
  file_type: string;
  created_at: string;
}

export interface EarningsSummary {
  id: string;
  ticker_id: string;
  earnings_date: string;
  content_md: string;
  created_at: string;
}

export type KpiDirection = "higher_better" | "lower_better" | "neutral";

export interface Kpi {
  id: string;
  ticker_id: string;
  name: string;
  reason: string;
  target: string;
  unit: string;
  direction: KpiDirection;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface KpiObservation {
  id: string;
  kpi_id: string;
  fiscal_period: string;
  period_sort: string;
  value: number | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export type ValuationMultipleType =
  | "pe"
  | "ev_ebitda"
  | "ev_ebit"
  | "ps"
  | "ev_sales"
  | "p_fcf"
  | "pb"
  | "other";

export interface ValuationMethod {
  id: string;
  ticker_id: string;
  multiple_type: ValuationMultipleType;
  multiple_type_other: string;
  entry_multiple: number | null;
  entry_rationale: string;
  exit_multiple: number | null;
  exit_rationale: string;
  created_at: string;
  updated_at: string;
}

export interface InvestmentScorecard {
  id: string;
  ticker_id: string;
  // Pillar 1: Management Quality (max 15)
  p1_capital_allocation: number;
  p1_insider_ownership: number;
  p1_investor_relations: number;
  p1_founder_involvement: number;
  p1_ceo_quality: number;
  p1_notes: string;
  // Pillar 2: Business Quality (max 12)
  p2_competitive_moat: number;
  p2_pricing_power: number;
  p2_reinvestment_runway: number;
  p2_balance_sheet: number;
  p2_notes: string;
  // Pillar 3: Growing Business Fundamentals (max 12)
  p3_roic_trend: number;
  p3_margin_expansion: number;
  p3_visible_catalysts: number;
  p3_under_followed: number;
  p3_notes: string;
  // Pillar 4: Valuation (max 12)
  p4_absolute_valuation: number;
  p4_relative_valuation: number;
  p4_downside_protection: number;
  p4_risk_reward: number;
  p4_notes: string;
  // Pillar 5: Business Simplicity (max 9)
  p5_accounting_clarity: number;
  p5_capital_structure: number;
  p5_debt_structure: number;
  p5_notes: string;
  created_at: string;
  updated_at: string;
}

type TickerInsert = {
  id?: string;
  symbol: string;
  company_name: string;
  status?: TickerStatus;
  confidence_score?: number | null;
  price_score?: number | null;
  five_pillars_score?: number | null;
  last_earnings_date?: string | null;
  next_earnings_date?: string | null;
  created_at?: string;
  updated_at?: string;
};

type TickerUpdate = {
  symbol?: string;
  company_name?: string;
  status?: TickerStatus;
  confidence_score?: number | null;
  price_score?: number | null;
  five_pillars_score?: number | null;
  last_earnings_date?: string | null;
  next_earnings_date?: string | null;
  current_price?: number | null;
  price_updated_at?: string | null;
};

export type Database = {
  public: {
    Tables: {
      tickers: {
        Row: Ticker;
        Insert: TickerInsert;
        Update: TickerUpdate;
        Relationships: [];
      };
      writeups: {
        Row: Writeup;
        Insert: {
          id?: string;
          ticker_id: string;
          title: string;
          content_md?: string;
          version?: number;
          created_at?: string;
        };
        Update: { title?: string; content_md?: string };
        Relationships: [];
      };
      attachments: {
        Row: Attachment;
        Insert: {
          id?: string;
          ticker_id: string;
          filename: string;
          storage_path: string;
          file_type: string;
          created_at?: string;
        };
        Update: { filename?: string };
        Relationships: [];
      };
      earnings_summaries: {
        Row: EarningsSummary;
        Insert: {
          id?: string;
          ticker_id: string;
          earnings_date: string;
          content_md?: string;
          created_at?: string;
        };
        Update: { content_md?: string };
        Relationships: [];
      };
      investment_scorecards: {
        Row: InvestmentScorecard;
        Insert: Omit<InvestmentScorecard, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<InvestmentScorecard, "id" | "ticker_id" | "created_at">>;
        Relationships: [];
      };
      kpis: {
        Row: Kpi;
        Insert: Omit<Kpi, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Kpi, "id" | "ticker_id" | "created_at">>;
        Relationships: [];
      };
      kpi_observations: {
        Row: KpiObservation;
        Insert: Omit<KpiObservation, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<KpiObservation, "id" | "kpi_id" | "created_at">>;
        Relationships: [];
      };
      valuation_methods: {
        Row: ValuationMethod;
        Insert: Omit<ValuationMethod, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<ValuationMethod, "id" | "ticker_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, {
      Row: Record<string, unknown>;
      Relationships: never[];
    }>;
    Functions: Record<string, {
      Args: Record<string, unknown>;
      Returns: unknown;
    }>;
    Enums: { ticker_status: TickerStatus };
    CompositeTypes: Record<string, never>;
  };
};
