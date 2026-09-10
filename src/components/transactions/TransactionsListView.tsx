"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils/formatting";
import { CATEGORY_EMOJIS, EXPENSE_CATEGORIES } from "@/lib/utils/constants";
import { Modal } from "@/components/common/Modal";
import { useIncomes } from "@/hooks/useIncomes";
import { useExpenses } from "@/hooks/useExpenses";
import { useToast } from "@/hooks/useToast";
import type { Transaction } from "@/hooks/useRecentTransactions";

interface TransactionsPageProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function TransactionsListView({
  transactions,
  isLoading = false,
  onRefresh,
}: TransactionsPageProps) {
  const { updateIncome, deleteIncome } = useIncomes();
  const { updateExpense, deleteExpense } = useExpenses();
  const toast = useToast();

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const getCategoryEmoji = (category: string) => {
    return (
      CATEGORY_EMOJIS[category as keyof typeof CATEGORY_EMOJIS] || "💱"
    );
  };

  const handleDelete = async (id: string, type: "income" | "expense") => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta transacción?")) {
      return;
    }

    try {
      if (type === "income") {
        await deleteIncome(id);
      } else {
        await deleteExpense(id);
      }
      toast.success("✅ Transacción eliminada");
      onRefresh?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const filteredTransactions = useMemo(
    () =>
      filter === "all"
        ? transactions
        : transactions.filter((tx) => tx.type === filter),
    [transactions, filter]
  );

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setEditDate(tx.date);
    setEditName(tx.merchant);
    setEditAmount(tx.amount);
    setEditCategory(tx.category || (tx.type === "income" ? "other" : "Otros"));
    setEditDescription(tx.description ?? "");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingTx(null);
  };

  const handleEditSave = async () => {
    if (!editingTx) return;

    if (!editDate || editAmount <= 0 || !editName.trim()) {
      toast.error("Completa fecha, nombre y monto valido");
      return;
    }

    try {
      setIsSavingEdit(true);

      if (editingTx.type === "income") {
        await updateIncome(editingTx.id, {
          date: editDate,
          amount: editAmount,
          source: editCategory || "other",
          description: editDescription || undefined,
        });
      } else {
        await updateExpense(editingTx.id, {
          date: editDate,
          merchant: editName,
          amount: editAmount,
          category: editCategory || "Otros",
          description: editDescription || undefined,
        });
      }

      toast.success("✅ Transaccion actualizada");
      closeEditModal();
      onRefresh?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded bg-slate-700" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-24 rounded bg-slate-700 mb-2" />
                  <div className="h-3 w-16 rounded bg-slate-700" />
                </div>
              </div>
              <div className="h-5 w-20 rounded bg-slate-700 ml-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 xl:space-y-5">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 xl:gap-3">
          {(["all", "income", "expense"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`min-h-[40px] rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "border border-slate-600 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {f === "all" ? "Todas" : f === "income" ? "Ingresos" : "Gastos"}
            </button>
          ))}
        </div>

        {/* Transacciones */}
        <div className="space-y-3 xl:space-y-4">
          {filteredTransactions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
              <p className="text-slate-400">Sin transacciones</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800 xl:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0">
                      {getCategoryEmoji(tx.category)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {tx.merchant}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDate(tx.date)}
                        {tx.description && ` • ${tx.description}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:ml-2">
                    <span
                      className={`text-sm font-semibold whitespace-nowrap ${
                        tx.type === "income"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </span>

                    {/* Botones de acciones */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(tx)}
                        className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-blue-400"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(tx.id, tx.type)
                        }
                        className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-red-400"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        title={editingTx?.type === "income" ? "Editar Ingreso" : "Editar Gasto"}
        onClose={closeEditModal}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Fecha</label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {editingTx?.type === "income" ? "Fuente" : "Comercio"}
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white focus:outline-none"
              placeholder={editingTx?.type === "income" ? "salary / bonus / other" : "Tienda"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Monto</label>
            <input
              type="number"
              step="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(Number(e.target.value))}
              className="w-full min-h-[44px] rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {editingTx?.type === "income" ? "Tipo" : "Categoria"}
            </label>
            {editingTx?.type === "income" ? (
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white focus:outline-none"
              >
                <option value="salary">salary</option>
                <option value="bonus">bonus</option>
                <option value="other">other</option>
              </select>
            ) : (
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white focus:outline-none"
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Descripcion</label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={closeEditModal}
              className="flex-1 min-h-[44px] rounded-lg border border-slate-600 px-4 py-3 text-slate-300 transition-colors hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSavingEdit}
              onClick={handleEditSave}
              className="flex-1 min-h-[44px] rounded-lg bg-blue-600 px-4 py-3 text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
            >
              {isSavingEdit ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}


