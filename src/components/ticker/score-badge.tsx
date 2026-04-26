import { cn } from "@/lib/utils";

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 8) return "text-emerald-600 font-semibold";
  if (score >= 5) return "text-amber-600 font-medium";
  return "text-red-500 font-medium";
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground text-sm">—</span>;
  return <span className={cn("text-sm tabular-nums", scoreColor(score))}>{score}</span>;
}
