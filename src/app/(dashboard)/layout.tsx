import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { LayoutErrorBoundary } from "@/components/common/LayoutErrorBoundary";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
        <LayoutErrorBoundary>{children}</LayoutErrorBoundary>
      </main>
    </div>
  );
}
