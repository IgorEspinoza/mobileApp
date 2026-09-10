"use client";

import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/formatting";
import { CATEGORY_EMOJIS } from "@/lib/utils/constants";
import type { Transaction } from "@/hooks/useRecentTransactions";

interface RecentTransactionsProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

const CARD_STYLE = "rounded-xl border border-slate-700/50 bg-slate-800/50 p-4";

export function RecentTransactions({
  transactions,
  isLoading = false,
}: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Últimas Transacciones</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`${CARD_STYLE} animate-pulse`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded bg-slate-700" />
                  <div className="flex-1 min-w-0">
                    <div className="h-4 w-24 rounded bg-slate-700 mb-2" />
                    <div className="h-3 w-16 rounded bg-slate-700" />
                  </div>
                </div>
                <div className="h-5 w-20 rounded bg-slate-700 ml-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
        <div className="text-4xl mb-2">📝</div>
        <p className="text-slate-400">Sin transacciones aún</p>
        <p className="text-sm text-slate-500 mt-1">
          Registra tu primer ingreso o gasto
        </p>
      </div>
    );
  }

  const getCategoryEmoji = (category: string) => {
    return (
      CATEGORY_EMOJIS[category as keyof typeof CATEGORY_EMOJIS] || "💱"
    );
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Ayer";
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return formatDate(dateStr);
  };

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-white">Últimas Transacciones</h3>
        <Link
          href="/dashboard/transactions"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Ver todas →
        </Link>
      </div>

      <div className="space-y-3">
        {transactions.map((tx) => (
          <div key={tx.id} className={CARD_STYLE}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl flex-shrink-0">
                  {getCategoryEmoji(tx.category)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {tx.merchant}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatRelativeDate(tx.date)}
                  </p>
                </div>
              </div>
              <span
                className={`text-sm font-semibold sm:ml-2 ${
                  tx.type === "income"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {tx.type === "income" ? "+" : "-"}
                {formatCurrency(tx.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

