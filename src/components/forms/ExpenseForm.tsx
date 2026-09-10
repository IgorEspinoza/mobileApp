"use client";

import { useState } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/utils/constants";

interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  isLoading?: boolean;
  onClose?: () => void;
}

export interface ExpenseFormData {
  date: string;
  merchant: string;
  amount: number;
  category: string;
  description?: string;
}

export function ExpenseForm({
  onSubmit,
  isLoading = false,
  onClose,
}: ExpenseFormProps) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    date: new Date().toISOString().split("T")[0],
    merchant: "",
    amount: 0,
    category: "Otros",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.merchant.trim()) {
      setError("El comercio es requerido");
      return;
    }

    if (formData.amount <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    try {
      await onSubmit(formData);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar gasto");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Fecha */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Fecha
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) =>
            setFormData({ ...formData, date: e.target.value })
          }
          required
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white
                     focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
        />
      </div>

      {/* Comercio */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Comercio / Lugar
        </label>
        <input
          type="text"
          value={formData.merchant}
          onChange={(e) =>
            setFormData({ ...formData, merchant: e.target.value })
          }
          placeholder="Ej: Tottus, Uber Eats..."
          required
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
        />
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
          onChange={(e) =>
            setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
          }
          placeholder="0.00"
          required
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
        />
      </div>

      {/* Categoría */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Categoría
        </label>
        <select
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white
                     focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
        >
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Descripción (opcional)
        </label>
        <input
          type="text"
          value={formData.description || ""}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Ej: Compras semanales"
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
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
          className="flex-1 min-h-[44px] py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-medium transition-colors"
        >
          {isLoading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

