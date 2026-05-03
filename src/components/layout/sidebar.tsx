"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Calendar, Globe, KanbanSquare, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart2 },
  { href: "/task-board", label: "Task Board", icon: KanbanSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/market-overview", label: "Market Overview", icon: Globe },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] shrink-0 hidden lg:flex flex-col bg-sidebar border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-7">
        <div className="w-7 h-7 rounded-[6px] bg-sidebar-foreground flex items-center justify-center">
          <TrendingUp className="h-[14px] w-[14px] text-sidebar" strokeWidth={2} />
        </div>
        <span className="text-sidebar-foreground font-semibold text-[15px] tracking-tight">TalDor</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted px-2 mb-1">
          Menu
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex w-full items-center gap-2.5 px-2 py-[10px] text-sm transition-colors",
                active
                  ? "bg-black/[0.07] text-sidebar-foreground font-medium"
                  : "text-sidebar-muted hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="mx-5 border-t border-border pt-4 pb-6">
        <p className="text-[11px] text-sidebar-muted">Investment tracker</p>
      </div>
    </aside>
  );
}
