"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHomes, type HomeWithMembers } from "@/hooks/useHomes";
import { useSharedExpenses } from "@/hooks/useSharedExpenses";
import { MembersManagement } from "./MembersManagement";
import { SharedExpenseForm, type SharedExpenseFormData } from "./SharedExpenseForm";
import { SharedExpensesList } from "./SharedExpensesList";
import { Loading } from "@/components/common/Loading";
import type { SharedExpense } from "@/types/database";

interface HomeDashboardProps {
  homeId: string;
  onDeleted: () => void;
}

export function HomeDashboard({ homeId, onDeleted }: HomeDashboardProps) {
  const { user } = useAuth();
  const { getHome, updateHome, deleteHome, inviteMember, removeMember, isLoading: homeLoading } = useHomes();
  const { getSharedExpenses, createSharedExpense, updateSharedExpense, deleteSharedExpense, isLoading: expenseLoading } = useSharedExpenses();

  const [home, setHome] = useState<HomeWithMembers | null>(null);
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<SharedExpense | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const isOwner = home?.creator_id === user?.id;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [homeData, expensesData] = await Promise.all([
        getHome(homeId),
        getSharedExpenses(homeId),
      ]);
      setHome(homeData);
      setExpenses(expensesData);
      setEditName(homeData.name);
      setEditDesc(homeData.description ?? "");
    } catch {
      // errors handled by hooks
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateExpense = async (data: SharedExpenseFormData) => {
    await createSharedExpense(homeId, data);
    setShowExpenseForm(false);
    await loadData();
  };

  const handleUpdateExpense = async (data: SharedExpenseFormData) => {
    if (!editingExpense) return;
    await updateSharedExpense(homeId, editingExpense.id, data);
    setEditingExpense(null);
    await loadData();
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("¿Eliminar este gasto compartido?")) return;
    await deleteSharedExpense(homeId, expenseId);
    await loadData();
  };

  const handleInvite = async (email: string) => {
    await inviteMember(homeId, { email });
    await loadData();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("¿Eliminar este miembro del hogar?")) return;
    await removeMember(homeId, memberId);
    await loadData();
  };

  const handleUpdateHome = async () => {
    await updateHome(homeId, { name: editName, description: editDesc || undefined });
    setShowSettings(false);
    await loadData();
  };

  const handleDeleteHome = async () => {
    if (!confirm("¿Eliminar este hogar? Se borrarán todos los gastos compartidos y miembros.")) return;
    await deleteHome(homeId);
    onDeleted();
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-10">
        <Loading text="Cargando hogar..." />
      </div>
    );
  }

  if (!home) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-8 text-center">
        <p className="text-sm text-slate-400">No se pudo cargar el hogar</p>
      </div>
    );
  }

  // Calculate balance summary
  const myExpenses = expenses
    .filter((e) => e.created_by === user?.id)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{home.name}</h2>
          {home.description && (
            <p className="mt-1 text-sm text-slate-400">{home.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowExpenseForm(true)}
            className="min-h-[40px] rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Gasto
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="min-h-[40px] rounded-lg border border-slate-600 px-3 py-2.5 text-sm text-slate-300 hover:border-slate-400 hover:bg-slate-800 transition-colors"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
          <p className="text-xs text-slate-400 mb-1">Total gastos</p>
          <p className="text-xl font-bold text-white">${totalExpenses.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
          <p className="text-xs text-slate-400 mb-1">Mis aportes</p>
          <p className="text-xl font-bold text-emerald-400">${myExpenses.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
          <p className="text-xs text-slate-400 mb-1">Miembros</p>
          <p className="text-xl font-bold text-blue-400">{home.members.length}</p>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && isOwner && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5 space-y-4">
          <h3 className="text-lg font-semibold text-white">Configuración del hogar</h3>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Descripción</label>
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleUpdateHome}
              disabled={homeLoading}
              className="min-h-[40px] rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={handleDeleteHome}
              disabled={homeLoading}
              className="min-h-[40px] rounded-lg border border-red-500/50 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
            >
              Eliminar hogar
            </button>
          </div>
        </div>
      )}

      {/* Members */}
      <MembersManagement
        members={home.members}
        currentUserId={user?.id ?? ""}
        isOwner={isOwner}
        onInvite={handleInvite}
        onRemove={handleRemoveMember}
        isLoading={homeLoading}
      />

      {/* Shared Expenses */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Gastos compartidos</h3>
        <SharedExpensesList
          expenses={expenses}
          members={home.members}
          currentUserId={user?.id ?? ""}
          onEdit={(expense) => setEditingExpense(expense)}
          onDelete={handleDeleteExpense}
          isLoading={expenseLoading}
        />
      </div>

      {/* Modals */}
      {showExpenseForm && (
        <SharedExpenseForm
          members={home.members}
          onSubmit={handleCreateExpense}
          isLoading={expenseLoading}
          onClose={() => setShowExpenseForm(false)}
        />
      )}

      {editingExpense && (
        <SharedExpenseForm
          members={home.members}
          onSubmit={handleUpdateExpense}
          isLoading={expenseLoading}
          onClose={() => setEditingExpense(null)}
          initialData={{
            date: editingExpense.date,
            merchant: editingExpense.merchant,
            amount: editingExpense.amount,
            category: editingExpense.category,
            split_type: editingExpense.split_type,
            splits: editingExpense.splits,
            description: editingExpense.description ?? "",
          }}
        />
      )}
    </div>
  );
}
