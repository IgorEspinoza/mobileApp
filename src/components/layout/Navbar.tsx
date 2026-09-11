"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transacciones" },
  { href: "/transactions/review", label: "Revisar correos" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, signOut, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700/70 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-base font-semibold text-white">
            MiDinero AI
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_LINKS.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex min-h-[40px] items-center rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-blue-500/20 text-blue-300"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="min-h-[40px] rounded-lg border border-slate-600 px-3 py-2.5 text-sm text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-800 sm:hidden"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            Menu
          </button>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-100">{user?.full_name ?? "Usuario"}</p>
            <p className="text-xs text-slate-400">{user?.email ?? "Sin email"}</p>
          </div>

          <button
            type="button"
            onClick={signOut}
            disabled={isLoading}
            className="min-h-[40px] rounded-lg border border-slate-600 px-3 py-2.5 text-sm text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Salir
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          id="mobile-nav-menu"
          className="border-t border-slate-700/70 bg-slate-900/98 px-4 py-4 sm:hidden"
        >
          <div className="mb-4">
            <p className="text-sm font-medium text-slate-100">{user?.full_name ?? "Usuario"}</p>
            <p className="text-xs text-slate-400">{user?.email ?? "Sin email"}</p>
          </div>

          <nav className="space-y-2">
            {NAV_LINKS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[40px] items-center rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-blue-500/20 text-blue-300"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={signOut}
            disabled={isLoading}
            className="mt-4 min-h-[40px] w-full rounded-lg border border-slate-600 px-3 py-2.5 text-sm text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Salir
          </button>
        </div>
      )}
    </header>
  );
}
