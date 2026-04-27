import { createServerClient } from "@/lib/supabase/server";
import { EarningsCalendar } from "@/components/calendar/earnings-calendar";
import type { Ticker } from "@/types/database";

export const revalidate = 0;

export default async function CalendarPage() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("tickers")
    .select("*")
    .order("next_earnings_date", { ascending: true, nullsFirst: false });

  if (error) {
    return (
      <div className="text-destructive text-sm p-10">
        Failed to load tickers: {error.message}
      </div>
    );
  }

  return <EarningsCalendar tickers={(data ?? []) as Ticker[]} />;
}
