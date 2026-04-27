import json
import os
from datetime import datetime, date
from http.server import BaseHTTPRequestHandler
from zoneinfo import ZoneInfo

import pandas as pd
import yfinance as yf

ET = ZoneInfo("America/New_York")

INDICES = [
    ("S&P 500",      "^GSPC"),
    ("NASDAQ",       "^IXIC"),
    ("DOW",          "^DJI"),
    ("Russell 2000", "^RUT"),
    ("VIX",          "^VIX"),
]

SECTORS = [
    ("Energy",        "XLE"),
    ("Utilities",     "XLU"),
    ("Financials",    "XLF"),
    ("Health Care",   "XLV"),
    ("Industrials",   "XLI"),
    ("Materials",     "XLB"),
    ("Real Estate",   "XLRE"),
    ("Cons. Staples", "XLP"),
    ("Comm. Svcs",    "XLC"),
    ("Technology",    "XLK"),
    ("Cons. Disc.",   "XLY"),
]

RATES = [
    ("10Y Treasury", "^TNX"),
    ("30Y Treasury", "^TYX"),
    ("3M T-Bill",    "^IRX"),
]

COMMODITIES = [
    ("Gold",    "GC=F",  "${:,.0f}"),
    ("Oil WTI", "CL=F",  "${:.2f}"),
    ("Nat Gas", "NG=F",  "${:.3f}"),
    ("Copper",  "HG=F",  "${:.2f}"),
]

FX = [
    ("DXY",     "DX-Y.NYB", "{:.2f}"),
    ("EUR/USD", "EURUSD=X", "{:.4f}"),
    ("USD/JPY", "USDJPY=X", "{:.2f}"),
    ("GBP/USD", "GBPUSD=X", "{:.4f}"),
]

CRYPTO = [
    ("Bitcoin",  "BTC-USD", "${:,.0f}"),
    ("Ethereum", "ETH-USD", "${:,.0f}"),
]


def pct_change(first, last):
    if first is not None and last is not None and abs(float(first)) > 1e-9:
        return round((float(last) / float(first) - 1) * 100, 2)
    return None


def batch_week(syms):
    """Download 7-day daily history for a list of symbols.
    Returns {sym: {"cur": float, "chg_1w": float, "chg_1d": float}}
    """
    if not syms:
        return {}
    try:
        raw = yf.download(syms, period="7d", interval="1d", progress=False, auto_adjust=True)
        close = raw["Close"]
        # Normalise to DataFrame regardless of whether one or many symbols
        if isinstance(close, pd.Series):
            close = close.to_frame(name=syms[0] if len(syms) == 1 else syms[0])
        result = {}
        for sym in syms:
            if sym not in close.columns:
                continue
            col = close[sym].dropna()
            if len(col) < 2:
                continue
            cur    = float(col.iloc[-1])
            first  = float(col.iloc[0])
            prev_d = float(col.iloc[-2])
            result[sym] = {
                "cur":    cur,
                "chg_1w": pct_change(first, cur),
                "chg_1d": pct_change(prev_d, cur),
            }
        return result
    except Exception:
        return {}


def batch_ytd(syms):
    """Returns {sym: ytd_pct} from Jan 1 to today."""
    if not syms:
        return {}
    try:
        start = f"{date.today().year}-01-01"
        raw = yf.download(syms, start=start, interval="1d", progress=False, auto_adjust=True)
        close = raw["Close"]
        if isinstance(close, pd.Series):
            close = close.to_frame(name=syms[0])
        result = {}
        for sym in syms:
            if sym not in close.columns:
                continue
            col = close[sym].dropna()
            if len(col) >= 2:
                result[sym] = pct_change(float(col.iloc[0]), float(col.iloc[-1]))
        return result
    except Exception:
        return {}


def fmt_value(cur, fmt):
    if cur is None:
        return "—"
    try:
        return fmt.format(cur)
    except Exception:
        return f"{cur:.2f}"


def build():
    idx_syms  = [s for _, s in INDICES]
    sec_syms  = [s for _, s in SECTORS]
    rate_syms = [s for _, s in RATES]
    com_syms  = [s for _, s, _ in COMMODITIES]
    fx_syms   = [s for _, s, _ in FX]
    cry_syms  = [s for _, s, _ in CRYPTO]

    # Fetch in groups to avoid mixing equity/futures/forex quirks
    w: dict = {}
    for group in [idx_syms, sec_syms, rate_syms, com_syms, fx_syms, cry_syms]:
        w.update(batch_week(group))

    ytd = batch_ytd(idx_syms)
    now = datetime.now(ET)

    # ── Indices ──────────────────────────────────────────────────────────────
    indices = []
    for name, sym in INDICES:
        d = w.get(sym, {})
        indices.append({
            "symbol":    name,
            "value":     round(d.get("cur") or 0, 2),
            "change_1d": d.get("chg_1d"),
            "change_1w": d.get("chg_1w"),
            "ytd":       ytd.get(sym),
        })

    # ── Sectors ──────────────────────────────────────────────────────────────
    sectors = []
    for name, sym in SECTORS:
        d = w.get(sym, {})
        sectors.append({
            "name":      name,
            "change_1d": d.get("chg_1d"),
            "change_1w": d.get("chg_1w"),
        })

    # ── Macro groups ─────────────────────────────────────────────────────────
    rates = []
    for label, sym in RATES:
        d = w.get(sym, {})
        cur = d.get("cur")
        rates.append({"label": label, "value": f"{cur:.2f}%" if cur is not None else "—", "change_1w": d.get("chg_1w")})

    commodities = [
        {"label": label, "value": fmt_value(w.get(sym, {}).get("cur"), fmt), "change_1w": w.get(sym, {}).get("chg_1w")}
        for label, sym, fmt in COMMODITIES
    ]
    fx = [
        {"label": label, "value": fmt_value(w.get(sym, {}).get("cur"), fmt), "change_1w": w.get(sym, {}).get("chg_1w")}
        for label, sym, fmt in FX
    ]
    crypto = [
        {"label": label, "value": fmt_value(w.get(sym, {}).get("cur"), fmt), "change_1w": w.get(sym, {}).get("chg_1w")}
        for label, sym, fmt in CRYPTO
    ]

    # ── Sector breadth summary ────────────────────────────────────────────────
    valid   = [s for s in sectors if s["change_1w"] is not None]
    up      = sum(1 for s in valid if s["change_1w"] >= 0)
    dn      = len(valid) - up
    best    = max(valid, key=lambda s: s["change_1w"], default=None)
    worst   = min(valid, key=lambda s: s["change_1w"], default=None)

    return {
        "indices": indices,
        "sectors": sectors,
        "macro": {"rates": rates, "commodities": commodities, "fx": fx, "crypto": crypto},
        "breadth": {
            "sectorsUp":   up,
            "sectorsDown": dn,
            "bestSector":  best["name"]      if best  else None,
            "bestChange":  best["change_1w"] if best  else None,
            "worstSector": worst["name"]      if worst else None,
            "worstChange": worst["change_1w"] if worst else None,
        },
        "asOf": now.strftime("%b %-d, %Y · %-I:%M %p ET"),
    }


class handler(BaseHTTPRequestHandler):
    """GET /api/market_overview — 1-week market data via yfinance"""

    def _respond(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        try:
            self._respond(build())
        except Exception as e:
            self._respond({"error": str(e)}, 500)

    def log_message(self, *args):
        pass
