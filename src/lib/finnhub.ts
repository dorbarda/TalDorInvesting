const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY!;
const BASE_URL = "https://finnhub.io/api/v1";

export async function fetchNextEarningsDate(symbol: string): Promise<string | null> {
  const today = new Date();
  const from = today.toISOString().split("T")[0];
  const to = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
    .toISOString()
    .split("T")[0];

  const url = `${BASE_URL}/calendar/earnings?from=${from}&to=${to}&symbol=${symbol}&token=${FINNHUB_API_KEY}`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) return null;

  const data = await res.json();
  const earnings: { date: string }[] = data.earningsCalendar ?? [];

  if (earnings.length === 0) return null;

  earnings.sort((a, b) => a.date.localeCompare(b.date));
  return earnings[0].date;
}
