import json
import os
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from zoneinfo import ZoneInfo

import yfinance as yf
from supabase import create_client

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

ET = ZoneInfo("America/New_York")


def is_market_open() -> bool:
    """Return True if US market is currently open (Mon–Fri 9:30–16:00 ET)."""
    now = datetime.now(ET)
    if now.weekday() >= 5:
        return False
    market_open = now.replace(hour=9, minute=30, second=0, microsecond=0)
    market_close = now.replace(hour=16, minute=0, second=0, microsecond=0)
    return market_open <= now < market_close


def get_current_price(symbol: str) -> float | None:
    try:
        price = yf.Ticker(symbol).fast_info.last_price
        if price and price > 0:
            return round(float(price), 2)
        return None
    except Exception:
        return None


def refresh_prices(symbol_filter: str | None = None, force: bool = False) -> dict:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"error": "Supabase env vars not set", "refreshed": 0, "total": 0}

    if not force and not is_market_open():
        return {"skipped": True, "reason": "market closed", "refreshed": 0, "total": 0}

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    query = sb.table("tickers").select("id, symbol")
    if symbol_filter:
        query = query.eq("symbol", symbol_filter.upper())

    rows = query.execute().data
    updated = 0
    errors = []
    now_utc = datetime.now(timezone.utc).isoformat()

    for row in rows:
        symbol = row["symbol"]
        try:
            price = get_current_price(symbol)
            if price is not None:
                sb.table("tickers").update({
                    "current_price": price,
                    "price_updated_at": now_utc,
                }).eq("id", row["id"]).execute()
                updated += 1
            if not symbol_filter:
                time.sleep(0.1)
        except Exception as e:
            errors.append({"symbol": symbol, "error": str(e)})

    result = {"refreshed": updated, "total": len(rows)}
    if errors:
        result["errors"] = errors
    return result


class handler(BaseHTTPRequestHandler):
    """
    GET  /api/price_refresh          — Vercel hourly cron (skips if market closed)
    POST /api/price_refresh          — dashboard manual refresh (always runs)
    POST /api/price_refresh?symbol=X — single ticker refresh
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
        result = refresh_prices()
        self._respond(result)

    def do_POST(self):
        symbol = self._get_symbol()
        result = refresh_prices(symbol_filter=symbol, force=True)
        self._respond(result)

    def log_message(self, *args):
        pass
