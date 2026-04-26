import json
import os
import time
from datetime import date
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import yfinance as yf
from supabase import create_client

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")


def next_earnings_date(symbol: str) -> str | None:
    """Return the nearest upcoming earnings date for symbol, or None."""
    try:
        t = yf.Ticker(symbol)
        cal = t.calendar
        if not cal:
            return None

        # yfinance may return a dict or DataFrame depending on version
        if hasattr(cal, "to_dict"):
            cal = cal.to_dict()

        raw = cal.get("Earnings Date") or cal.get("earningsDate", [])
        if not raw:
            return None

        if not isinstance(raw, list):
            raw = [raw]

        today = date.today()
        future = [d for d in raw if hasattr(d, "date") and d.date() >= today]
        if not future:
            return None
        return min(future).strftime("%Y-%m-%d")
    except Exception:
        return None


def last_earnings_date(symbol: str) -> str | None:
    """Return the most recent past earnings date for symbol, or None."""
    try:
        t = yf.Ticker(symbol)
        cal = t.calendar
        if not cal:
            return None

        if hasattr(cal, "to_dict"):
            cal = cal.to_dict()

        raw = cal.get("Earnings Date") or cal.get("earningsDate", [])
        if not raw:
            return None

        if not isinstance(raw, list):
            raw = [raw]

        today = date.today()
        past = [d for d in raw if hasattr(d, "date") and d.date() < today]
        if not past:
            return None
        return max(past).strftime("%Y-%m-%d")
    except Exception:
        return None


def refresh_tickers(symbol_filter: str | None = None) -> dict:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"error": "Supabase env vars not set", "refreshed": 0, "total": 0}

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    query = sb.table("tickers").select("id, symbol")
    if symbol_filter:
        query = query.eq("symbol", symbol_filter.upper())

    rows = query.execute().data
    updated = 0
    errors = []

    for row in rows:
        symbol = row["symbol"]
        try:
            next_date = next_earnings_date(symbol)
            last_date = last_earnings_date(symbol)

            update_payload: dict = {}
            if next_date:
                update_payload["next_earnings_date"] = next_date
            if last_date:
                update_payload["last_earnings_date"] = last_date

            if update_payload:
                sb.table("tickers").update(update_payload).eq("id", row["id"]).execute()
                updated += 1

            # Gentle rate limiting for bulk refreshes
            if not symbol_filter:
                time.sleep(0.3)
        except Exception as e:
            errors.append({"symbol": symbol, "error": str(e)})

    result = {"refreshed": updated, "total": len(rows)}
    if errors:
        result["errors"] = errors
    return result


class handler(BaseHTTPRequestHandler):
    """
    GET  /api/earnings_refresh          — Vercel weekly cron
    POST /api/earnings_refresh          — dashboard "Refresh all" button
    POST /api/earnings_refresh?symbol=X — single ticker refresh (on creation or info tab)
    """

    def _respond(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _get_symbol(self) -> str | None:
        qs = parse_qs(urlparse(self.path).query)
        values = qs.get("symbol", [])
        return values[0].strip() if values else None

    def do_GET(self):
        result = refresh_tickers()
        self._respond(result)

    def do_POST(self):
        symbol = self._get_symbol()
        result = refresh_tickers(symbol_filter=symbol)
        self._respond(result)

    def log_message(self, *args):
        pass  # suppress default access logging
