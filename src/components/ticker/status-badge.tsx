import { cn } from "@/lib/utils";
import { STATUS_COLORS, STATUS_LABELS, type TickerStatus } from "@/lib/constants";

export function StatusBadge({ status }: { status: TickerStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
