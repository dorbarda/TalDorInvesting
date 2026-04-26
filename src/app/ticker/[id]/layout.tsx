import { AppNav } from "@/components/layout/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="max-w-screen-xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
