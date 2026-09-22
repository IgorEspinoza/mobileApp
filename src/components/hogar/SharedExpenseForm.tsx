"use client";

import { useState, useEffect } from "react";
import { EXPENSE_CATEGORIES, SPLIT_TYPES } from "@/lib/utils/constants";
import type { HomeMember, User } from "@/types/database";

type MemberWithUser = HomeMember & {
  user: Pick<User, "id" | "full_name" | "email" | "avatar_url">;
};

export interface SharedExpenseFormData {
  date: string;
  merchant: string;
  amount: number;
  category: string;
  split_type: "50/50" | "percentage" | "fixed";
  splits: Record<string, number>;
  description?: string;
}

interface SharedExpenseFormProps {
  members: MemberWithUser[];
  onSubmit: (data: SharedExpenseFormData) => Promise<void>;
  isLoading?: boolean;
  onClose?: () => void;
  initialData?: SharedExpenseFormData;
}

export function SharedExpenseForm({
  members,
  onSubmit,
  isLoading = false,
  onClose,
  initialData,
}: SharedExpenseFormProps) {
  const [formData, setFormData] = useState<SharedExpenseFormData>(
    initialData ?? {
      date: new Date().toISOString().split("T")[0],
      merchant: "",
      amount: 0,
      category: "Otros",
      split_type: "50/50",
      splits: {},
      description: "",
    }
  );
  const [error, setError] = useState<string | null>(null);

  // Auto-calculate splits when split_type or amount changes
  useEffect(() => {
    if (members.length === 0) return;

    if (formData.split_type === "50/50") {
      const equalShare = 1; // placeholder value, backend splits equally
      const newSplits: Record<string, number> = {};
      members.forEach((m) => {
        newSplits[m.user_id] = equalShare;
      });
      setFormData((prev) => ({ ...prev, splits: newSplits }));
    } else if (formData.split_type === "percentage") {
      const pct = Math.floor(100 / members.length);
      const remainder = 100 - pct * members.length;
      const newSplits: Record<string, number> = {};
      members.forEach((m, i) => {
        newSplits[m.user_id] = pct + (i === 0 ? remainder : 0);
      });
      setFormData((prev) => ({ ...prev, splits: newSplits }));
    } else if (formData.split_type === "fixed" && formData.amount > 0) {
      const share = Math.floor((formData.amount / members.length) * 100) / 100;
      const remainder = Math.round((formData.amount - share * members.length) * 100) / 100;
      const newSplits: Record<string, number> = {};
      members.forEach((m, i) => {
        newSplits[m.user_id] = Math.round((share + (i === 0 ? remainder : 0)) * 100) / 100;
      });
      setFormData((prev) => ({ ...prev, splits: newSplits }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.split_type, formData.amount, members.length]);

  const handleSplitChange = (userId: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      splits: { ...prev.splits, [userId]: value },
    }));
  };

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

  const splitLabel = (type: string) => {
    switch (type) {
      case "50/50": return "Partes iguales";
      case "percentage": return "Porcentaje";
      case "fixed": return "Monto fijo";
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">
          {initialData ? "Editar gasto compartido" : "Nuevo gasto compartido"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Fecha</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Monto</label>
              <input
                type="number"
                value={formData.amount || ""}
                onChange={(e) => setFormData((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                min="0"
                step="1"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Comercio</label>
            <input
              type="text"
              value={formData.merchant}
              onChange={(e) => setFormData((p) => ({ ...p, merchant: e.target.value }))}
              placeholder="Ej: Supermercado Líder"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipo de división</label>
            <div className="flex gap-2">
              {SPLIT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, split_type: type }))}
                  className={`flex-1 min-h-[36px] rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    formData.split_type === type
                      ? "border-blue-500 bg-blue-500/20 text-blue-300"
                      : "border-slate-600 text-slate-400 hover:border-slate-400"
                  }`}
                >
                  {splitLabel(type)}
                </button>
              ))}
            </div>
          </div>

          {formData.split_type !== "50/50" && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                División por miembro {formData.split_type === "percentage" ? "(%)" : "($)"}
              </label>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-slate-300 truncate">
                      {member.user.full_name ?? member.user.email}
                    </span>
                    <input
                      type="number"
                      value={formData.splits[member.user_id] ?? 0}
                      onChange={(e) => handleSplitChange(member.user_id, parseFloat(e.target.value) || 0)}
                      min="0"
                      step={formData.split_type === "percentage" ? "1" : "1"}
                      className="w-24 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
                {formData.split_type === "percentage" && (
                  <p className={`text-xs ${
                    Math.abs(Object.values(formData.splits).reduce((a, b) => a + b, 0) - 100) < 0.01
                      ? "text-green-400"
                      : "text-red-400"
                  }`}>
                    Total: {Object.values(formData.splits).reduce((a, b) => a + b, 0)}%
                  </p>
                )}
                {formData.split_type === "fixed" && (
                  <p className={`text-xs ${
                    Math.abs(Object.values(formData.splits).reduce((a, b) => a + b, 0) - formData.amount) < 0.01
                      ? "text-green-400"
                      : "text-red-400"
                  }`}>
                    Total: ${Object.values(formData.splits).reduce((a, b) => a + b, 0).toLocaleString()} / ${formData.amount.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Descripción (opcional)</label>
            <input
              type="text"
              value={formData.description ?? ""}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Nota adicional..."
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[40px] rounded-lg border border-slate-600 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 min-h-[40px] rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Guardando..." : initialData ? "Actualizar" : "Crear gasto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
