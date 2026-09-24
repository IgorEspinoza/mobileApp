"use client";

import { useState, useEffect, useCallback } from "react";
import { useFixedExpenses, type FixedExpense } from "@/hooks/useFixedExpenses";
import { FixedExpenseForm, type FixedExpenseFormData } from "@/components/forms/FixedExpenseForm";
import { Modal } from "@/components/common/Modal";
import { formatCurrency } from "@/lib/utils/formatting";
import { FIXED_CATEGORY_EMOJIS } from "@/lib/utils/constants";

interface FixedExpensesSectionProps {
  homeId?: string;
}

export function FixedExpensesSection({ homeId }: FixedExpensesSectionProps) {
  const {
    fixedExpenses,
    isLoading,
    error,
    fetchFixedExpenses,
    createFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
  } = useFixedExpenses();

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });

  // Fetch all fixed expenses (no month filter to show history)
  const loadData = useCallback(async () => {
    await fetchFixedExpenses(undefined, homeId);
  }, [fetchFixedExpenses, homeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter expenses for the selected month
  const currentMonthExpenses = fixedExpenses.filter(
    (fe) => fe.month === selectedMonth
  );

  // Get unique months from all expenses for the month selector
  const availableMonths = [...new Set(fixedExpenses.map((fe) => fe.month).filter(Boolean))]
    .sort()
    .reverse() as string[];

  // Calculate total for current month
  const monthTotal = currentMonthExpenses.reduce((sum, fe) => sum + (fe.amount || 0), 0);

  // Build month-over-month comparison (last 6 months with data)
  const monthlyTotals = availableMonths.slice(0, 6).map((m) => {
    const monthExpenses = fixedExpenses.filter((fe) => fe.month === m);
    const total = monthExpenses.reduce((sum, fe) => sum + (fe.amount || 0), 0);
    const date = new Date(m + "T00:00:00");
    const label = date.toLocaleDateString("es-CL", { month: "short", year: "2-digit" });
    return { month: m, label, total };
  }).reverse();

  const maxMonthTotal = Math.max(...monthlyTotals.map((m) => m.total), 1);

  const handleCreate = async (data: FixedExpenseFormData) => {
    await createFixedExpense(data);
    setShowForm(false);
    await loadData();
  };

  const handleUpdate = async (data: FixedExpenseFormData) => {
    if (!editingExpense) return;
    await updateFixedExpense(editingExpense.id, {
      category: data.category,
      amount: data.amount,
      month: data.month,
      description: data.description,
    });
    setEditingExpense(null);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este gasto fijo?")) return;
    await deleteFixedExpense(id);
    await loadData();
  };

  // Generate month options for the selector
  const now = new Date();
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = -12; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const label = d.toLocaleDateString("es-CL", { year: "numeric", month: "long" });
    monthOptions.push({ value, label });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Gastos Fijos</h3>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="min-h-[40px] rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-500 transition-colors"
        >
          + Gasto Fijo
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400">Mes:</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Monthly total card */}
      <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-orange-900/20 to-slate-900 p-5">
        <p className="text-xs text-slate-400 mb-1">Total gastos fijos del mes</p>
        <p className="text-3xl font-bold text-orange-400">{formatCurrency(monthTotal)}</p>
        {currentMonthExpenses.length > 0 && (
          <p className="text-xs text-slate-500 mt-1">{currentMonthExpenses.length} gastos registrados</p>
        )}
      </div>

      {/* Current month expenses list */}
      {isLoading && fixedExpenses.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-sm">Cargando gastos fijos...</div>
      ) : currentMonthExpenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-6 text-center">
          <p className="text-slate-400 text-sm">No hay gastos fijos registrados para este mes</p>
          <p className="text-slate-500 text-xs mt-1">Agrega arriendo, gasto común, servicios básicos, etc.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentMonthExpenses.map((fe) => (
            <div
              key={fe.id}
              className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{FIXED_CATEGORY_EMOJIS[fe.category] ?? "📌"}</span>
                <div>
                  <p className="text-sm font-medium text-white">{fe.category}</p>
                  {fe.description && (
                    <p className="text-xs text-slate-400">{fe.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-orange-400">{formatCurrency(fe.amount)}</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingExpense(fe)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(fe.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly variation chart (simple bar chart) */}
      {monthlyTotals.length > 1 && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h4 className="text-sm font-semibold text-slate-300 mb-4">Variación mensual</h4>
          <div className="flex items-end gap-2 h-32">
            {monthlyTotals.map((m) => {
              const heightPct = (m.total / maxMonthTotal) * 100;
              const isSelected = m.month === selectedMonth;
              return (
                <button
                  key={m.month}
                  type="button"
                  onClick={() => setSelectedMonth(m.month)}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <span className="text-xs text-slate-400 group-hover:text-white transition-colors">
                    {formatCurrency(m.total)}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isSelected
                        ? "bg-orange-500"
                        : "bg-slate-600 group-hover:bg-slate-500"
                    }`}
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                  <span className={`text-xs ${isSelected ? "text-orange-400 font-medium" : "text-slate-500"}`}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add modal */}
      <Modal
        isOpen={showForm}
        title="Agregar Gasto Fijo"
        onClose={() => setShowForm(false)}
        size="md"
      >
        <FixedExpenseForm
          onSubmit={handleCreate}
          isLoading={isLoading}
          onClose={() => setShowForm(false)}
          homeId={homeId}
          initialData={{ month: selectedMonth }}
        />
      </Modal>

      {/* Edit modal */}
      {editingExpense && (
        <Modal
          isOpen={true}
          title="Editar Gasto Fijo"
          onClose={() => setEditingExpense(null)}
          size="md"
        >
          <FixedExpenseForm
            onSubmit={handleUpdate}
            isLoading={isLoading}
            onClose={() => setEditingExpense(null)}
            homeId={homeId}
            initialData={{
              category: editingExpense.category,
              amount: editingExpense.amount,
              month: editingExpense.month ?? selectedMonth,
              description: editingExpense.description ?? "",
            }}
          />
        </Modal>
      )}
    </div>
  );
}
