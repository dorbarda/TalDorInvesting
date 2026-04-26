import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { symbol: string } }) {
  // Wired up in step 8
  return NextResponse.json({ symbol: params.symbol, nextEarningsDate: null });
}
