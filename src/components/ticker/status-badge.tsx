import { cn } from "@/lib/utils";
import { STATUS_LABELS, type TickerStatus } from "@/lib/constants";

const CHIP: Record<TickerStatus, { container: string; dot: string }> = {
  holding:  { container: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-600" },
  watching: { container: "bg-blue-100 text-blue-700",       dot: "bg-blue-600" },
  passed:   { container: "bg-gray-100 text-gray-500",       dot: "bg-gray-400" },
  exited:   { container: "bg-amber-100 text-amber-700",     dot: "bg-amber-500" },
};

export function StatusBadge({ status }: { status: TickerStatus }) {
  const s = CHIP[status];
  return (
    <span className={cn(
      "inline-flex items-center gap-[5px] rounded-full px-2.5 py-[3px] text-xs font-medium",
      s.container
    )}>
      <span className={cn("h-[5px] w-[5px] rounded-full opacity-80 shrink-0", s.dot)} />
      {STATUS_LABELS[status]}
    </span>
  );
}
