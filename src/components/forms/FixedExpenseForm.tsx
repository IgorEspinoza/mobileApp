"use client";

import { useState } from "react";
import { FIXED_EXPENSE_CATEGORIES, FIXED_CATEGORY_EMOJIS } from "@/lib/utils/constants";

export interface FixedExpenseFormData {
  category: string;
  amount: number;
  month: string;
  home_id?: string;
  description?: string;
}

interface FixedExpenseFormProps {
  onSubmit: (data: FixedExpenseFormData) => Promise<void>;
  isLoading?: boolean;
  onClose?: () => void;
  initialData?: Partial<FixedExpenseFormData>;
  homeId?: string;
}

export function FixedExpenseForm({
  onSubmit,
  isLoading = false,
  onClose,
  initialData,
  homeId,
}: FixedExpenseFormProps) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [formData, setFormData] = useState<FixedExpenseFormData>({
    category: initialData?.category ?? "Arriendo",
    amount: initialData?.amount ?? 0,
    month: initialData?.month ?? defaultMonth,
    home_id: homeId,
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
        description: formData.description || undefined,
      });
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar gasto fijo");
    }
  };

  const set = (field: Partial<FixedExpenseFormData>) =>
    setFormData((prev) => ({ ...prev, ...field }));

  // Generate month options (last 12 months + next 2)
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = -12; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const label = d.toLocaleDateString("es-CL", { year: "numeric", month: "long" });
    monthOptions.push({ value, label });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Categoría */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Tipo de gasto fijo
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FIXED_EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => set({ category: cat })}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                formData.category === cat
                  ? "border-orange-500 bg-orange-500/20 text-orange-300"
                  : "border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500"
              }`}
            >
              <span>{FIXED_CATEGORY_EMOJIS[cat] ?? "📌"}</span>
              <span>{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mes */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Mes del pago
        </label>
        <select
          value={formData.month}
          onChange={(e) => set({ month: e.target.value })}
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white
                     focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Monto */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Monto (CLP)
        </label>
        <input
          type="number"
          step="1"
          value={formData.amount || ""}
          onChange={(e) => set({ amount: parseFloat(e.target.value) || 0 })}
          placeholder="Ej: 163037"
          required
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Nota{" "}
          <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          value={formData.description ?? ""}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Ej: Incluye calefacción"
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
