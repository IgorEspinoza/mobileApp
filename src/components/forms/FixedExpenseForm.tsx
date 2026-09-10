"use client";

import { useState } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/utils/constants";

export interface FixedExpenseFormData {
  category: string;
  amount: number;
  frequency: "monthly" | "weekly";
  start_date: string;
  end_date?: string;
  description?: string;
}

interface FixedExpenseFormProps {
  onSubmit: (data: FixedExpenseFormData) => Promise<void>;
  isLoading?: boolean;
  onClose?: () => void;
  initialData?: Partial<FixedExpenseFormData>;
}

export function FixedExpenseForm({
  onSubmit,
  isLoading = false,
  onClose,
  initialData,
}: FixedExpenseFormProps) {
  const [formData, setFormData] = useState<FixedExpenseFormData>({
    category: initialData?.category ?? "Otros",
    amount: initialData?.amount ?? 0,
    frequency: initialData?.frequency ?? "monthly",
    start_date: initialData?.start_date ?? new Date().toISOString().split("T")[0],
    end_date: initialData?.end_date ?? "",
    description: initialData?.description ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.amount <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    try {
      await onSubmit({
        ...formData,
        end_date: formData.end_date || undefined,
        description: formData.description || undefined,
      });
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar gasto fijo");
    }
  };

  const set = (field: Partial<FixedExpenseFormData>) =>
    setFormData((prev) => ({ ...prev, ...field }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Categoría */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Categoría
        </label>
        <select
          value={formData.category}
          onChange={(e) => set({ category: e.target.value })}
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white
                     focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
        >
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Monto */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Monto
        </label>
        <input
          type="number"
          step="0.01"
          value={formData.amount || ""}
          onChange={(e) => set({ amount: parseFloat(e.target.value) || 0 })}
          placeholder="0"
          required
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
        />
      </div>

      {/* Frecuencia */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Frecuencia
        </label>
        <select
          value={formData.frequency}
          onChange={(e) =>
            set({ frequency: e.target.value as "monthly" | "weekly" })
          }
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white
                     focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
        >
          <option value="monthly">Mensual</option>
          <option value="weekly">Semanal</option>
        </select>
      </div>

      {/* Fecha inicio */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Fecha de inicio
        </label>
        <input
          type="date"
          value={formData.start_date}
          onChange={(e) => set({ start_date: e.target.value })}
          required
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white
                     focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
        />
      </div>

      {/* Fecha fin (opcional) */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Fecha de término{" "}
          <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          type="date"
          value={formData.end_date ?? ""}
          onChange={(e) => set({ end_date: e.target.value })}
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white
                     focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Descripción{" "}
          <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          value={formData.description ?? ""}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Ej: Arriendo departamento"
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Botones */}
      <div className="flex flex-col gap-3 pt-4 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 min-h-[44px] py-3 px-4 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 min-h-[44px] py-3 px-4 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 disabled:cursor-not-allowed text-white font-medium transition-colors"
        >
          {isLoading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

