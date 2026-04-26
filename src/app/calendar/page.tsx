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
      <div className="text-destructive text-sm">
        Failed to load tickers: {error.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Earnings Calendar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Click any event to open the ticker. Use the dashboard to refresh earnings dates.
        </p>
      </div>
      <EarningsCalendar tickers={(data ?? []) as Ticker[]} />
    </div>
  );
}
