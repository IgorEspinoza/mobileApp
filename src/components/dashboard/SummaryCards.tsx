"use client";

import { formatCurrency } from "@/lib/utils/formatting";

interface SummaryCardsProps {
  month: string;
  incomes: number;
  expenses: number;
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
  "rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-lg xl:p-7";
const VALUE_STYLE = "mt-2 text-3xl font-bold text-white xl:text-4xl";
const LABEL_STYLE = "text-sm font-medium text-slate-300";

export function SummaryCards({
  month,
  incomes,
  expenses,
  savings,
  freeBalance,
  accumulated,
  isLoading = false,
}: SummaryCardsProps) {
  const cards = [
    {
      emoji: "💰",
      label: "Ingresos",
      value: incomes,
      color: "text-green-400",
    },
    {
      emoji: "💸",
      label: "Gastos",
      value: expenses,
      color: "text-red-400",
    },
    {
      emoji: "💎",
      label: "Ahorro",
      value: savings,
      color: "text-blue-400",
    },
    {
      emoji: "💳",
      label: "Saldo Libre",
      value: freeBalance,
      color: "text-purple-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:gap-5">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`${CARD_STYLE} animate-pulse`}
          >
            <div className="h-8 w-8 rounded bg-slate-700" />
            <div className="mt-2 h-4 w-24 rounded bg-slate-700" />
            <div className="mt-4 h-8 w-32 rounded bg-slate-700" />
          </div>
        ))}
      </div>
    );
  }

  const accumulatedCards = accumulated
    ? [
        {
          emoji: "📊",
          label: "Total Ingresos",
          value: accumulated.incomes,
          color: "text-green-400",
        },
        {
          emoji: "📉",
          label: "Total Gastos",
          value: accumulated.expenses,
          color: "text-red-400",
        },
        {
          emoji: "🏦",
          label: "Balance General",
          value: accumulated.balance,
          color: accumulated.balance >= 0 ? "text-emerald-400" : "text-orange-400",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Totales acumulados */}
      {accumulated && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-300">Resumen General</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {accumulatedCards.map((card) => (
              <div key={card.label} className={CARD_STYLE}>
                <div className="text-3xl">{card.emoji}</div>
                <div className={LABEL_STYLE}>{card.label}</div>
                <div className={`${VALUE_STYLE} ${card.color}`}>
                  {formatCurrency(card.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen del mes actual */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-300">Este Mes: {month}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className={CARD_STYLE}>
              <div className="text-3xl">{card.emoji}</div>
              <div className={LABEL_STYLE}>{card.label}</div>
              <div className={`${VALUE_STYLE} ${card.color}`}>
                {formatCurrency(card.value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

