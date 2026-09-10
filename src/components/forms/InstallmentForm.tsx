"use client";

import { useState } from "react";

export interface InstallmentFormData {
  product_name: string;
  total_amount: number;
  num_installments: number;
  start_date: string;
}

interface InstallmentFormProps {
  onSubmit: (data: InstallmentFormData) => Promise<void>;
  isLoading?: boolean;
  onClose?: () => void;
  initialData?: Partial<InstallmentFormData>;
}

export function InstallmentForm({
  onSubmit,
  isLoading = false,
  onClose,
  initialData,
}: InstallmentFormProps) {
  const [formData, setFormData] = useState<InstallmentFormData>({
    product_name: initialData?.product_name ?? "",
    total_amount: initialData?.total_amount ?? 0,
    num_installments: initialData?.num_installments ?? 1,
    start_date: initialData?.start_date ?? new Date().toISOString().split("T")[0],
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.product_name.trim()) {
      setError("El nombre del producto es requerido");
      return;
    }

    if (formData.total_amount <= 0) {
      setError("El monto total debe ser mayor a 0");
      return;
    }

    if (formData.num_installments <= 0) {
      setError("El número de cuotas debe ser mayor a 0");
      return;
    }

    try {
      await onSubmit({
        ...formData,
        product_name: formData.product_name.trim(),
      });
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar cuota");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Producto
        </label>
        <input
          type="text"
          value={formData.product_name}
          onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
          placeholder="Ej: Notebook"
          required
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Monto total
        </label>
        <input
          type="number"
          step="0.01"
          value={formData.total_amount || ""}
          onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
          placeholder="0"
          required
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Número de cuotas
        </label>
        <input
          type="number"
          min={1}
          step={1}
          value={formData.num_installments || ""}
          onChange={(e) => setFormData({ ...formData, num_installments: parseInt(e.target.value) || 0 })}
          placeholder="12"
          required
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Fecha de inicio
        </label>
        <input
          type="date"
          value={formData.start_date}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          required
          className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-slate-700/50 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

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
          className="flex-1 min-h-[44px] py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium transition-colors"
        >
          {isLoading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

