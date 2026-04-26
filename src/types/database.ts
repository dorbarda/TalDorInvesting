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
