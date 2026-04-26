import json
import os
from datetime import date
from http.server import BaseHTTPRequestHandler

import yfinance as yf
from supabase import create_client

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]


def next_earnings_date(symbol: str) -> str | None:
    try:
        t = yf.Ticker(symbol)
        cal = t.calendar
        if not cal:
            return None
        raw = cal.get("Earnings Date") or cal.get("earningsDate", [])
        if not raw:
            return None
        # raw may be a list of Timestamps or a single Timestamp
        if not isinstance(raw, list):
            raw = [raw]
        today = date.today()
        future = [d for d in raw if hasattr(d, "date") and d.date() >= today]
        if not future:
            return None
        return min(future).strftime("%Y-%m-%d")
    except Exception:
        return None


class handler(BaseHTTPRequestHandler):
    """
    GET  /api/earnings_refresh         — called by Vercel cron (weekly)
    POST /api/earnings_refresh         — called by dashboard "Refresh" button
    POST /api/earnings_refresh?symbol= — refresh one ticker after creation
    """

    def _refresh(self, symbol_filter: str | None = None):
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)

        query = sb.table("tickers").select("id, symbol")
        if symbol_filter:
            query = query.eq("symbol", symbol_filter.upper())

        rows = query.execute().data
        updated = 0

        for row in rows:
            next_date = next_earnings_date(row["symbol"])
            if next_date:
                sb.table("tickers").update(
                    {"next_earnings_date": next_date}
                ).eq("id", row["id"]).execute()
                updated += 1

        return {"refreshed": updated, "total": len(rows)}

    def _respond(self, payload: dict, status: int = 200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        # Cron trigger — refresh all
        result = self._refresh()
        self._respond(result)

    def do_POST(self):
        from urllib.parse import urlparse, parse_qs
        qs = parse_qs(urlparse(self.path).query)
        symbol = qs.get("symbol", [None])[0]
        result = self._refresh(symbol_filter=symbol)
        self._respond(result)

    def log_message(self, *args):
        pass  # suppress default stderr logging
