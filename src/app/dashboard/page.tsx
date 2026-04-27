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
      <div className="text-destructive text-sm p-10">
        Failed to load tickers: {error.message}
      </div>
    );
  }

  return <TickerTable tickers={data ?? []} />;
}
