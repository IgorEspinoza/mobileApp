"use client";

import { formatCurrency } from "@/lib/utils/formatting";

interface SummaryCardsProps {
  month: string;
  incomes: number;
  expenses: number;
  fixedExpenses?: number;
  totalExpenses?: number;
  savings: number;
  freeBalance: number;
  accumulated?: {
    incomes: number;
    expenses: number;
    balance: number;
  };
  isLoading?: boolean;
}

const CARD_STYLE =
  "rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-lg";
const VALUE_STYLE = "mt-2 text-2xl font-bold text-white xl:text-3xl";
const LABEL_STYLE = "text-xs font-medium text-slate-300";

export function SummaryCards({
  month,
  incomes,
  expenses,
  fixedExpenses = 0,
  savings,
  accumulated,
  isLoading = false,
}: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`${CARD_STYLE} animate-pulse`}>
            <div className="h-6 w-6 rounded bg-slate-700" />
            <div className="mt-2 h-3 w-20 rounded bg-slate-700" />
            <div className="mt-3 h-7 w-28 rounded bg-slate-700" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      emoji: "💰",
      label: `Ingresos`,
      value: incomes,
      color: "text-green-400",
    },
    {
      emoji: "🛒",
      label: `Gastos Variables`,
      value: expenses,
      color: "text-red-400",
    },
    {
      emoji: "🏠",
      label: `Gastos Fijos`,
      value: fixedExpenses,
      color: "text-orange-400",
    },
    {
      emoji: "💎",
      label: `Balance`,
      value: savings,
      color: savings >= 0 ? "text-emerald-400" : "text-red-400",
    },
    {
      emoji: "🏦",
      label: "Acumulado",
      value: accumulated?.expenses ?? expenses + fixedExpenses,
      color: "text-red-300",
      subtitle: "Total histórico",
    },
  ];

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-300">
        Resumen Financiero — {month}
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className={CARD_STYLE}>
            <div className="text-2xl">{card.emoji}</div>
            <div className={LABEL_STYLE}>{card.label}</div>
            <div className={`${VALUE_STYLE} ${card.color}`}>
              {formatCurrency(card.value)}
            </div>
            {"subtitle" in card && card.subtitle && (
              <div className="mt-1 text-xs text-slate-500">{card.subtitle}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
