"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Calendar, Globe, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart2 },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/market-overview", label: "Market Overview", icon: Globe },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-card h-12 flex items-center px-4 gap-6 sticky top-0 z-40">
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sm mr-2">
        <TrendingUp className="h-4 w-4" />
        TalDor
      </Link>
      <nav className="flex items-center gap-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              pathname.startsWith(href)
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
