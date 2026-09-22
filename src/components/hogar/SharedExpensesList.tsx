"use client";

import { CATEGORY_EMOJIS } from "@/lib/utils/constants";
import type { SharedExpense } from "@/types/database";
import type { HomeMember, User } from "@/types/database";

type MemberWithUser = HomeMember & {
  user: Pick<User, "id" | "full_name" | "email" | "avatar_url">;
};

interface SharedExpensesListProps {
  expenses: SharedExpense[];
  members: MemberWithUser[];
  currentUserId: string;
  onEdit?: (expense: SharedExpense) => void;
  onDelete?: (expenseId: string) => void;
  isLoading?: boolean;
}

export function SharedExpensesList({
  expenses,
  members,
  currentUserId,
  onEdit,
  onDelete,
  isLoading = false,
}: SharedExpensesListProps) {
  const getMemberName = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    if (!member) return "Desconocido";
    return member.user_id === currentUserId ? "Tú" : (member.user.full_name ?? member.user.email);
  };

  const formatSplit = (expense: SharedExpense, userId: string) => {
    const splitValue = expense.splits[userId];
    if (splitValue === undefined) return null;

    if (expense.split_type === "50/50") {
      return `$${Math.round(expense.amount / Object.keys(expense.splits).length).toLocaleString()}`;
    }
    if (expense.split_type === "percentage") {
      return `${splitValue}% ($${Math.round((expense.amount * splitValue) / 100).toLocaleString()})`;
    }
    return `$${splitValue.toLocaleString()}`;
  };

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/40 p-8 text-center">
        <div className="text-3xl mb-2">💸</div>
        <p className="text-sm text-slate-400">No hay gastos compartidos aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => (
        <div
          key={expense.id}
          className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="text-xl flex-shrink-0 mt-0.5">
                {CATEGORY_EMOJIS[expense.category] ?? "📦"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{expense.merchant}</p>
                <p className="text-xs text-slate-400">
                  {new Date(expense.date + "T12:00:00").toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {expense.category}
                </p>
                {expense.description && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{expense.description}</p>
                )}
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-white">
                ${expense.amount.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">
                {expense.split_type === "50/50"
                  ? "Partes iguales"
                  : expense.split_type === "percentage"
                  ? "Por %"
                  : "Monto fijo"}
              </p>
            </div>
          </div>

          {/* Split details */}
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.keys(expense.splits).map((userId) => (
              <span
                key={userId}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${
                  userId === currentUserId
                    ? "bg-blue-500/15 text-blue-300"
                    : "bg-slate-700/60 text-slate-400"
                }`}
              >
                {getMemberName(userId)}: {formatSplit(expense, userId)}
              </span>
            ))}
          </div>

          {/* Actions */}
          {(onEdit || onDelete) && (
            <div className="mt-3 flex justify-end gap-2 border-t border-slate-700/30 pt-3">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(expense)}
                  disabled={isLoading}
                  className="min-h-[32px] rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700/50 hover:text-white disabled:opacity-50 transition-colors"
                >
                  Editar
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(expense.id)}
                  disabled={isLoading}
                  className="min-h-[32px] rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                >
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
