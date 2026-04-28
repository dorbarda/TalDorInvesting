import type { LucideIcon } from "lucide-react";
import type { TickerTaskData } from "./task-board";
import { TaskCard } from "./task-card";

type TaskKey = "thesis" | "prepForEarnings" | "summarizeEarnings";

interface TaskColumnProps {
  title: string;
  icon: LucideIcon;
  tasks: TickerTaskData[];
  taskKey: TaskKey;
  emptyMessage: string;
}

export function TaskColumn({ title, icon: Icon, tasks, taskKey, emptyMessage }: TaskColumnProps) {
  const todo = tasks.filter((t) => (t[taskKey] as string) === "todo");
  const done = tasks.filter((t) => (t[taskKey] as string) === "done");

  return (
    <div className="flex-1 flex flex-col border-r border-border last:border-r-0 overflow-hidden">
      {/* Column header */}
      <div className="px-4 pt-5 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-[13px] font-semibold text-foreground">{title}</span>
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-medium text-amber-600 dark:text-amber-400">{todo.length} todo</span>
          <span>·</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">{done.length} done</span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {tasks.length === 0 ? (
          <p className="text-[12px] text-muted-foreground text-center pt-8 px-4">{emptyMessage}</p>
        ) : (
          <>
            {todo.map((t) => (
              <TaskCard key={t.ticker.id} data={t} taskKey={taskKey} />
            ))}
            {done.length > 0 && todo.length > 0 && (
              <div className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Done
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            {done.map((t) => (
              <TaskCard key={t.ticker.id} data={t} taskKey={taskKey} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
