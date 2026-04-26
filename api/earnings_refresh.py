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


def _split_earnings_dates(symbol: str) -> tuple[list[date], list[date]]:
    """
    Return (future_dates, past_dates) for the given symbol.

    Primary source: t.earnings_dates — a DataFrame whose DatetimeIndex
    contains both upcoming (Reported EPS is NaN) and historical entries.
    Fallback: t.calendar — dict with an 'Earnings Date' key that holds
    the upcoming earnings window only (no historical data).
    """
    t = yf.Ticker(symbol)
    today = date.today()
    future: list[date] = []
    past: list[date] = []

    # Primary: earnings_dates covers history + upcoming
    try:
        df = t.earnings_dates
        if df is not None and not df.empty:
            for ts in df.index:
                d = ts.date() if hasattr(ts, "date") else None
                if d is None:
                    continue
                if d >= today:
                    future.append(d)
                else:
                    past.append(d)
            if future or past:
                return future, past
    except Exception:
        pass

    # Fallback: calendar (upcoming window only — no past dates)
    try:
        cal = t.calendar
        if not cal:
            return [], []

        if hasattr(cal, "index"):  # DataFrame (older yfinance)
            try:
                raw = cal.loc["Earnings Date"].dropna().tolist()
            except Exception:
                raw = []
        else:  # dict (yfinance 0.2.x)
            raw = cal.get("Earnings Date") or cal.get("earningsDate", [])

        if not isinstance(raw, list):
            raw = [raw] if raw else []

        for item in raw:
            d = item.date() if hasattr(item, "date") else None
            if d is None:
                continue
            if d >= today:
                future.append(d)
            else:
                past.append(d)
    except Exception:
        pass

    return future, past


def next_earnings_date(symbol: str) -> str | None:
    try:
        future, _ = _split_earnings_dates(symbol)
        return min(future).strftime("%Y-%m-%d") if future else None
    except Exception:
        return None


def last_earnings_date(symbol: str) -> str | None:
    try:
        _, past = _split_earnings_dates(symbol)
        return max(past).strftime("%Y-%m-%d") if past else None
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
