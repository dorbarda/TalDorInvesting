import { NextResponse } from "next/server";

// Vercel cron: configure in vercel.json
// { "crons": [{ "path": "/api/cron/weekly-refresh", "schedule": "0 6 * * 1" }] }
export async function GET() {
  // Wired up in step 8
  return NextResponse.json({ ok: true });
}
