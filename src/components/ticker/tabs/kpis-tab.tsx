"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, Minus, Gauge, Target,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  Kpi, KpiObservation, KpiDirection,
  ValuationMethod, ValuationMultipleType,
} from "@/types/database";

// ─── Constants ──────────────────────────────────────────────────────────────

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
type Quarter = (typeof QUARTERS)[number];
const QUARTER_MONTH: Record<Quarter, number> = { Q1: 1, Q2: 4, Q3: 7, Q4: 10 };

const DIRECTION_META: Record<KpiDirection, { label: string; Icon: typeof TrendingUp }> = {
  higher_better: { label: "Higher is better", Icon: TrendingUp },
  lower_better:  { label: "Lower is better",  Icon: TrendingDown },
  neutral:       { label: "Neutral",          Icon: Minus },
};

const MULTIPLE_LABEL: Record<ValuationMultipleType, string> = {
  pe: "P/E",
  ev_ebitda: "EV/EBITDA",
  ev_ebit: "EV/EBIT",
  ps: "P/S",
  ev_sales: "EV/Sales",
  p_fcf: "P/FCF",
  pb: "P/B",
  other: "Other",
};

const MULTIPLE_OPTIONS: ValuationMultipleType[] = [
  "pe", "ev_ebitda", "ev_ebit", "ps", "ev_sales", "p_fcf", "pb", "other",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function periodSort(quarter: Quarter, year: number): string {
  const month = QUARTER_MONTH[quarter];
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function periodLabel(quarter: Quarter, year: number): string {
  return `${quarter} ${year}`;
}

function currentQuarter(): { quarter: Quarter; year: number } {
  const d = new Date();
  const q = (Math.floor(d.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  return { quarter: `Q${q}` as Quarter, year: d.getFullYear() };
}

function formatNumber(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return (n / 1_000).toFixed(2) + "K";
  return n.toString();
}

// ─── Main component ────────────────────────────────────────────────────────

export function KpisTab({
  tickerId,
  initialKpis,
  initialObservations,
  initialValuation,
}: {
  tickerId: string;
  initialKpis: Kpi[];
  initialObservations: KpiObservation[];
  initialValuation: ValuationMethod | null;
}) {
  const router = useRouter();
  const [kpis, setKpis] = useState(initialKpis);
  const [observations, setObservations] = useState(initialObservations);

  const [kpiDialog, setKpiDialog] = useState<{ mode: "new" | "edit"; kpi?: Kpi } | null>(null);
  const [obsDialog, setObsDialog] = useState<{ kpi: Kpi; obs?: KpiObservation } | null>(null);

  const obsByKpi = useMemo(() => {
    const map = new Map<string, KpiObservation[]>();
    for (const o of observations) {
      const list = map.get(o.kpi_id) ?? [];
      list.push(o);
      map.set(o.kpi_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.period_sort.localeCompare(a.period_sort));
    }
    return map;
  }, [observations]);

  async function deleteKpi(id: string) {
    if (!confirm("Delete this KPI and all its quarterly observations?")) return;
    const { error } = await supabase.from("kpis").delete().eq("id", id);
    if (error) { toast.error("Delete failed: " + error.message); return; }
    setKpis((prev) => prev.filter((k) => k.id !== id));
    setObservations((prev) => prev.filter((o) => o.kpi_id !== id));
    toast.success("KPI deleted");
    router.refresh();
  }

  async function deleteObservation(id: string) {
    const { error } = await supabase.from("kpi_observations").delete().eq("id", id);
    if (error) { toast.error("Delete failed: " + error.message); return; }
    setObservations((prev) => prev.filter((o) => o.id !== id));
    toast.success("Observation deleted");
    router.refresh();
  }

  function upsertKpiLocal(k: Kpi) {
    setKpis((prev) => {
      const i = prev.findIndex((x) => x.id === k.id);
      if (i === -1) return [...prev, k];
      const copy = prev.slice();
      copy[i] = k;
      return copy;
    });
  }

  function upsertObservationLocal(o: KpiObservation) {
    setObservations((prev) => {
      const i = prev.findIndex((x) => x.id === o.id);
      if (i === -1) return [...prev, o];
      const copy = prev.slice();
      copy[i] = o;
      return copy;
    });
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl px-10 pb-12">
      {/* ─── KPIs section ─── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4" /> Key Performance Indicators
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Metrics we track quarter to quarter for this company.
            </p>
          </div>
          <Button size="sm" onClick={() => setKpiDialog({ mode: "new" })}>
            <Plus className="h-4 w-4" /> Add KPI
          </Button>
        </div>

        {kpis.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground border border-dashed rounded-lg">
            <Gauge className="h-7 w-7 opacity-30" />
            <p className="text-sm">No KPIs yet. Add the first one above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {kpis.map((k) => (
              <KpiCard
                key={k.id}
                kpi={k}
                observations={obsByKpi.get(k.id) ?? []}
                onEdit={() => setKpiDialog({ mode: "edit", kpi: k })}
                onDelete={() => deleteKpi(k.id)}
                onAddObservation={() => setObsDialog({ kpi: k })}
                onEditObservation={(obs) => setObsDialog({ kpi: k, obs })}
                onDeleteObservation={(id) => deleteObservation(id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── Valuation section ─── */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" /> Valuation Method
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            The multiple we use to size entry and exit decisions.
          </p>
        </div>
        <ValuationForm tickerId={tickerId} initial={initialValuation} />
      </section>

      {/* ─── Dialogs ─── */}
      {kpiDialog && (
        <KpiDialog
          tickerId={tickerId}
          initial={kpiDialog.kpi}
          existingCount={kpis.length}
          onClose={() => setKpiDialog(null)}
          onSaved={(k) => { upsertKpiLocal(k); setKpiDialog(null); router.refresh(); }}
        />
      )}
      {obsDialog && (
        <ObservationDialog
          kpi={obsDialog.kpi}
          initial={obsDialog.obs}
          onClose={() => setObsDialog(null)}
          onSaved={(o) => { upsertObservationLocal(o); setObsDialog(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

// ─── KPI card ───────────────────────────────────────────────────────────────

function KpiCard({
  kpi, observations,
  onEdit, onDelete, onAddObservation, onEditObservation, onDeleteObservation,
}: {
  kpi: Kpi;
  observations: KpiObservation[];
  onEdit: () => void;
  onDelete: () => void;
  onAddObservation: () => void;
  onEditObservation: (o: KpiObservation) => void;
  onDeleteObservation: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { Icon: DirIcon, label: dirLabel } = DIRECTION_META[kpi.direction];
  const latest = observations[0];
  const prior = observations[1];

  const trend =
    latest && prior && latest.value !== null && prior.value !== null
      ? latest.value - prior.value
      : null;
  const trendGood =
    trend === null
      ? null
      : kpi.direction === "higher_better"
        ? trend > 0
        : kpi.direction === "lower_better"
          ? trend < 0
          : null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-start gap-4 px-5 py-4">
        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-0.5 text-muted-foreground hover:text-foreground"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[14px] font-semibold">{kpi.name}</h3>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
              <DirIcon className="h-3 w-3" /> {dirLabel}
            </span>
            {kpi.unit && (
              <span className="text-[11px] text-muted-foreground">unit: {kpi.unit}</span>
            )}
          </div>

          {kpi.target && (
            <p className="text-[12px] mt-1.5">
              <span className="text-muted-foreground">Target: </span>
              <span className="font-medium">{kpi.target}</span>
            </p>
          )}
          {kpi.reason && (
            <p className="text-[12px] text-muted-foreground mt-1 leading-snug whitespace-pre-wrap">
              {kpi.reason}
            </p>
          )}

          {latest && (
            <div className="flex items-center gap-3 mt-2 text-[12px]">
              <span className="text-muted-foreground">Latest:</span>
              <span className="font-mono font-semibold">
                {formatNumber(latest.value)}{kpi.unit && latest.value !== null ? ` ${kpi.unit}` : ""}
              </span>
              <span className="text-muted-foreground">{latest.fiscal_period}</span>
              {trend !== null && (
                <span
                  className={cn(
                    "font-mono text-[11px]",
                    trendGood === true && "text-emerald-600 dark:text-emerald-400",
                    trendGood === false && "text-red-500",
                    trendGood === null && "text-muted-foreground",
                  )}
                >
                  {trend > 0 ? "+" : ""}{formatNumber(trend)} vs {prior!.fiscal_period}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="outline" onClick={onAddObservation}>
            <Plus className="h-3.5 w-3.5" /> Observation
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Edit KPI">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete KPI">
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-muted/20 px-5 py-3">
          {observations.length === 0 ? (
            <p className="text-[12px] text-muted-foreground py-2">
              No quarterly observations yet.
            </p>
          ) : (
            <div className="flex flex-col">
              {observations.map((o) => (
                <div
                  key={o.id}
                  className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0"
                >
                  <span className="text-[12px] font-medium w-20 shrink-0 mt-0.5">
                    {o.fiscal_period}
                  </span>
                  <span className="text-[13px] font-mono font-semibold w-24 shrink-0 mt-0.5">
                    {formatNumber(o.value)}
                    {kpi.unit && o.value !== null && (
                      <span className="text-muted-foreground font-normal"> {kpi.unit}</span>
                    )}
                  </span>
                  <span className="text-[12px] text-muted-foreground flex-1 whitespace-pre-wrap">
                    {o.note}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditObservation(o)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit observation"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete observation for ${o.fiscal_period}?`)) {
                          onDeleteObservation(o.id);
                        }
                      }}
                      className="text-muted-foreground hover:text-red-500"
                      aria-label="Delete observation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── KPI dialog (create / edit) ────────────────────────────────────────────

function KpiDialog({
  tickerId, initial, existingCount, onClose, onSaved,
}: {
  tickerId: string;
  initial?: Kpi;
  existingCount: number;
  onClose: () => void;
  onSaved: (k: Kpi) => void;
}) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [target, setTarget] = useState(initial?.target ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [direction, setDirection] = useState<KpiDirection>(initial?.direction ?? "higher_better");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) { toast.error("KPI name is required"); return; }
    setSaving(true);
    const payload = {
      ticker_id: tickerId,
      name: name.trim(),
      reason: reason.trim(),
      target: target.trim(),
      unit: unit.trim(),
      direction,
      display_order: initial?.display_order ?? existingCount,
    };

    const query = editing
      ? supabase.from("kpis").update(payload).eq("id", initial!.id).select().single()
      : supabase.from("kpis").insert(payload).select().single();

    const { data, error } = await query;
    setSaving(false);
    if (error || !data) {
      toast.error("Save failed: " + (error?.message ?? "unknown"));
      return;
    }
    toast.success(editing ? "KPI updated" : "KPI added");
    onSaved(data as Kpi);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit KPI" : "Add KPI"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kpi-name">KPI name</Label>
            <Input
              id="kpi-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Same-store sales growth"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kpi-reason">Reason for importance</Label>
            <Textarea
              id="kpi-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this metric matters to the thesis…"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kpi-target">What we'd like to see</Label>
            <Textarea
              id="kpi-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. > 5% YoY, accelerating from prior quarter"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kpi-unit">Unit (optional)</Label>
              <Input
                id="kpi-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="%, $, x, bps…"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kpi-direction">Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as KpiDirection)}>
                <SelectTrigger id="kpi-direction"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DIRECTION_META) as KpiDirection[]).map((d) => (
                    <SelectItem key={d} value={d}>{DIRECTION_META[d].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save" : "Add KPI"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Observation dialog (create / edit) ────────────────────────────────────

function ObservationDialog({
  kpi, initial, onClose, onSaved,
}: {
  kpi: Kpi;
  initial?: KpiObservation;
  onClose: () => void;
  onSaved: (o: KpiObservation) => void;
}) {
  const editing = !!initial;
  const fallback = currentQuarter();
  const initialQuarter: Quarter = initial
    ? (initial.fiscal_period.split(" ")[0] as Quarter)
    : fallback.quarter;
  const initialYear = initial
    ? Number(initial.fiscal_period.split(" ")[1])
    : fallback.year;

  const [quarter, setQuarter] = useState<Quarter>(initialQuarter);
  const [year, setYear] = useState<number>(initialYear);
  const [valueStr, setValueStr] = useState<string>(
    initial?.value !== null && initial?.value !== undefined ? String(initial.value) : ""
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!Number.isInteger(year) || year < 1900 || year > 2200) {
      toast.error("Enter a valid year");
      return;
    }
    const numericValue = valueStr.trim() === "" ? null : Number(valueStr);
    if (numericValue !== null && Number.isNaN(numericValue)) {
      toast.error("Value must be a number");
      return;
    }

    setSaving(true);
    const payload = {
      kpi_id: kpi.id,
      fiscal_period: periodLabel(quarter, year),
      period_sort: periodSort(quarter, year),
      value: numericValue,
      note: note.trim(),
    };

    const query = editing
      ? supabase.from("kpi_observations").update(payload).eq("id", initial!.id).select().single()
      : supabase
          .from("kpi_observations")
          .upsert(payload, { onConflict: "kpi_id,fiscal_period" })
          .select()
          .single();

    const { data, error } = await query;
    setSaving(false);
    if (error || !data) {
      toast.error("Save failed: " + (error?.message ?? "unknown"));
      return;
    }
    toast.success(editing ? "Observation updated" : "Observation added");
    onSaved(data as KpiObservation);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit observation" : "New observation"} — {kpi.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obs-quarter">Quarter</Label>
              <Select value={quarter} onValueChange={(v) => setQuarter(v as Quarter)}>
                <SelectTrigger id="obs-quarter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUARTERS.map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obs-year">Year</Label>
              <Input
                id="obs-year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={1900}
                max={2200}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obs-value">Value{kpi.unit ? ` (${kpi.unit})` : ""}</Label>
            <Input
              id="obs-value"
              value={valueStr}
              onChange={(e) => setValueStr(e.target.value)}
              placeholder="Numeric value (optional)"
              inputMode="decimal"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obs-note">Note</Label>
            <Textarea
              id="obs-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Commentary, source, caveat…"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save" : "Add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Valuation form ─────────────────────────────────────────────────────────

function ValuationForm({
  tickerId, initial,
}: {
  tickerId: string;
  initial: ValuationMethod | null;
}) {
  const router = useRouter();
  const [multipleType, setMultipleType] = useState<ValuationMultipleType>(
    initial?.multiple_type ?? "pe"
  );
  const [multipleTypeOther, setMultipleTypeOther] = useState(initial?.multiple_type_other ?? "");
  const [entryMultiple, setEntryMultiple] = useState<string>(
    initial?.entry_multiple != null ? String(initial.entry_multiple) : ""
  );
  const [entryRationale, setEntryRationale] = useState(initial?.entry_rationale ?? "");
  const [exitMultiple, setExitMultiple] = useState<string>(
    initial?.exit_multiple != null ? String(initial.exit_multiple) : ""
  );
  const [exitRationale, setExitRationale] = useState(initial?.exit_rationale ?? "");
  const [saving, setSaving] = useState(false);

  function parseMultiple(s: string): number | null {
    if (s.trim() === "") return null;
    const n = Number(s);
    return Number.isNaN(n) ? Number.NaN : n;
  }

  async function handleSave() {
    const entryN = parseMultiple(entryMultiple);
    const exitN = parseMultiple(exitMultiple);
    if (Number.isNaN(entryN) || Number.isNaN(exitN)) {
      toast.error("Multiples must be numeric");
      return;
    }
    if (multipleType === "other" && !multipleTypeOther.trim()) {
      toast.error("Describe the 'Other' multiple");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("valuation_methods")
      .upsert(
        {
          ticker_id: tickerId,
          multiple_type: multipleType,
          multiple_type_other: multipleTypeOther.trim(),
          entry_multiple: entryN,
          entry_rationale: entryRationale.trim(),
          exit_multiple: exitN,
          exit_rationale: exitRationale.trim(),
        },
        { onConflict: "ticker_id" }
      );
    setSaving(false);
    if (error) { toast.error("Save failed: " + error.message); return; }
    toast.success("Valuation saved");
    router.refresh();
  }

  return (
    <div className="border border-border rounded-lg p-5 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="val-multiple-type">Multiple type</Label>
          <Select
            value={multipleType}
            onValueChange={(v) => setMultipleType(v as ValuationMultipleType)}
          >
            <SelectTrigger id="val-multiple-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MULTIPLE_OPTIONS.map((m) => (
                <SelectItem key={m} value={m}>{MULTIPLE_LABEL[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {multipleType === "other" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="val-multiple-other">Describe</Label>
            <Input
              id="val-multiple-other"
              value={multipleTypeOther}
              onChange={(e) => setMultipleTypeOther(e.target.value)}
              placeholder="e.g. EV/Subscriber"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2 border-l-2 border-emerald-500/50 pl-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Entry
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="val-entry">Entry multiple</Label>
            <Input
              id="val-entry"
              value={entryMultiple}
              onChange={(e) => setEntryMultiple(e.target.value)}
              placeholder="e.g. 12.5"
              inputMode="decimal"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="val-entry-reason">Entry rationale</Label>
            <Textarea
              id="val-entry-reason"
              value={entryRationale}
              onChange={(e) => setEntryRationale(e.target.value)}
              placeholder="Why we are willing to enter at this multiple"
              rows={3}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-l-2 border-amber-500/50 pl-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Exit
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="val-exit">Exit multiple</Label>
            <Input
              id="val-exit"
              value={exitMultiple}
              onChange={(e) => setExitMultiple(e.target.value)}
              placeholder="e.g. 22"
              inputMode="decimal"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="val-exit-reason">Exit rationale</Label>
            <Textarea
              id="val-exit-reason"
              value={exitRationale}
              onChange={(e) => setExitRationale(e.target.value)}
              placeholder="When/why we'd take the trade off"
              rows={3}
            />
          </div>
        </div>
      </div>

      <div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save valuation"}
        </Button>
      </div>
    </div>
  );
}
