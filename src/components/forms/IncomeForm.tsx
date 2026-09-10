"use client";

import { useState } from "react";

interface IncomeFormProps {
  onSubmit: (data: IncomeFormData) => Promise<void>;
  isLoading?: boolean;
  onClose?: () => void;
}

export interface IncomeFormData {
  date: string;
  amount: number;
  source: "salary" | "bonus" | "other";
  description?: string;
}

export function IncomeForm({
  onSubmit,
  isLoading = false,
  onClose,
}: IncomeFormProps) {
  const [formData, setFormData] = useState<IncomeFormData>({
    date: new Date().toISOString().split("T")[0],
    amount: 0,
    source: "salary",
    description: "",
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
      await onSubmit(formData);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar ingreso");
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
                     focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
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
                     focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
        />
      </div>

      {/* Fuente */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Fuente
        </label>
        <select
          value={formData.source}
          onChange={(e) =>
            setFormData({
              ...formData,
              source: e.target.value as "salary" | "bonus" | "other",
            })
          }
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white
                     focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
        >
          <option value="salary">Salario</option>
          <option value="bonus">Bono</option>
          <option value="other">Otro</option>
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
          placeholder="Ej: Sueldo quincenal"
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
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
          className="flex-1 min-h-[44px] py-3 px-4 rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-medium transition-colors"
        >
          {isLoading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

