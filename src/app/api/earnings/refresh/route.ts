import { NextResponse } from "next/server";

export async function POST() {
  // Wired up in step 8
  return NextResponse.json({ refreshed: 0 });
}
