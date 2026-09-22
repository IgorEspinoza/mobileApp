"use client";

import type { Home } from "@/types/database";

interface HomeSelectorProps {
  homes: Home[];
  selectedHomeId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export function HomeSelector({ homes, selectedHomeId, onSelect, onCreateNew }: HomeSelectorProps) {
  if (homes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/40 p-8 text-center">
        <div className="text-4xl mb-3">🏠</div>
        <h3 className="text-lg font-semibold text-white mb-1">Sin hogares</h3>
        <p className="text-sm text-slate-400 mb-4">
          Crea un hogar para compartir gastos con tu familia o roommates
        </p>
        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex min-h-[40px] items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Crear hogar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {homes.map((home) => (
        <button
          key={home.id}
          type="button"
          onClick={() => onSelect(home.id)}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
            selectedHomeId === home.id
              ? "border-blue-500 bg-blue-500/20 text-blue-300"
              : "border-slate-600 text-slate-300 hover:border-slate-400 hover:bg-slate-800"
          }`}
        >
          🏠 {home.name}
        </button>
      ))}
      <button
        type="button"
        onClick={onCreateNew}
        className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-dashed border-slate-600 px-4 py-2.5 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-300 transition-colors"
      >
        + Nuevo
      </button>
    </div>
  );
}
