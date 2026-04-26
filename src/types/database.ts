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

// Supabase client generic type
export interface Database {
  public: {
    Tables: {
      tickers: {
        Row: Ticker;
        Insert: Omit<Ticker, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Ticker, "id" | "created_at" | "updated_at">>;
      };
      writeups: {
        Row: Writeup;
        Insert: Omit<Writeup, "id" | "created_at">;
        Update: Partial<Omit<Writeup, "id" | "created_at">>;
      };
      attachments: {
        Row: Attachment;
        Insert: Omit<Attachment, "id" | "created_at">;
        Update: Partial<Omit<Attachment, "id" | "created_at">>;
      };
      earnings_summaries: {
        Row: EarningsSummary;
        Insert: Omit<EarningsSummary, "id" | "created_at">;
        Update: Partial<Omit<EarningsSummary, "id" | "created_at">>;
      };
    };
  };
}
