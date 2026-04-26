import { createServerClient } from "@/lib/supabase/server";
import { TickerTable } from "@/components/dashboard/ticker-table";
import type { Ticker } from "@/types/database";

export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("tickers")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Ticker[]>();

  if (error) {
    return (
      <div className="text-destructive text-sm">
        Failed to load tickers: {error.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All investment ideas and holdings</p>
      </div>
      <TickerTable tickers={data ?? []} />
    </div>
  );
}
