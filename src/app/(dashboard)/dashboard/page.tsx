"use client";

import { useEffect, useState } from "react";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { Modal } from "@/components/common/Modal";
import { Loading } from "@/components/common/Loading";
import { IncomeForm, type IncomeFormData } from "@/components/forms/IncomeForm";
import { ExpenseForm, type ExpenseFormData } from "@/components/forms/ExpenseForm";
import { InstallmentForm, type InstallmentFormData } from "@/components/forms/InstallmentForm";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useRecentTransactions } from "@/hooks/useRecentTransactions";
import { useIncomes } from "@/hooks/useIncomes";
import { useExpenses } from "@/hooks/useExpenses";
import {
  useInstallments,
  type Installment,
  type InstallmentCharge,
} from "@/hooks/useInstallments";
import { useToast } from "@/hooks/useToast";

export default function DashboardPage() {
  const {
    summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useDashboardSummary();
  const {
    transactions,
    isLoading: txLoading,
    refetch: refetchTransactions,
  } = useRecentTransactions(5);
  const { createIncome, isLoading: incomeLoading } = useIncomes();
  const { createExpense, isLoading: expenseLoading } = useExpenses();
  const {
    installments,
    isLoading: installmentsLoading,
    error: installmentsError,
    fetchInstallments,
    createInstallment,
    fetchInstallmentCharges,
    isLoading: installmentLoading,
  } = useInstallments();
  const toast = useToast();

  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [showInstallmentHistoryModal, setShowInstallmentHistoryModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [installmentCharges, setInstallmentCharges] = useState<InstallmentCharge[]>([]);
  const [chargesLoading, setChargesLoading] = useState(false);

  useEffect(() => {
    void fetchInstallments();
  }, [fetchInstallments]);

  const handleIncomeSubmit = async (data: IncomeFormData) => {
    try {
      await createIncome(data);
      toast.success("✅ Ingreso registrado exitosamente");
      setShowIncomeModal(false);
      await Promise.all([refetchSummary(), refetchTransactions()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar ingreso");
    }
  };

  const handleExpenseSubmit = async (data: ExpenseFormData) => {
    try {
      await createExpense(data);
      toast.success("✅ Gasto registrado exitosamente");
      setShowExpenseModal(false);
      await Promise.all([refetchSummary(), refetchTransactions()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar gasto");
    }
  };

  const handleInstallmentSubmit = async (data: InstallmentFormData) => {
    try {
      await createInstallment(data);
      toast.success("✅ Cuota registrada exitosamente");
      setShowInstallmentModal(false);
      await Promise.all([refetchSummary(), fetchInstallments()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar cuota");
    }
  };

  const openInstallmentHistory = async (installment: Installment) => {
    setSelectedInstallment(installment);
    setShowInstallmentHistoryModal(true);
    setChargesLoading(true);
    try {
      const charges = await fetchInstallmentCharges(installment.id);
      setInstallmentCharges(charges);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar historial de cuota");
      setInstallmentCharges([]);
    } finally {
      setChargesLoading(false);
    }
  };

  const showInitialLoading = summaryLoading && txLoading && !summary && transactions.length === 0;

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white xl:text-4xl">
          Mi Dinero
        </h1>
        <p className="mt-2 text-slate-300 xl:text-base">
          Resumen financiero de este mes
        </p>
      </div>

      {showInitialLoading && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-10">
          <Loading text="Cargando dashboard..." />
        </div>
      )}

      {summaryError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">
          <p>⚠️ {summaryError}</p>
        </div>
      )}

      {summary && (
        <SummaryCards
          month={summary.month}
          incomes={summary.incomes}
          expenses={summary.expenses}
          savings={summary.savings}
          freeBalance={summary.freeBalance}
          isLoading={summaryLoading}
        />
      )}

      {summaryLoading && !summary && !showInitialLoading && (
        <SummaryCards
          month="Cargando..."
          incomes={0}
          expenses={0}
          savings={0}
          freeBalance={0}
          isLoading={true}
        />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4 xl:items-start">
        <div className="xl:col-span-3">
          <RecentTransactions
            transactions={transactions}
            isLoading={txLoading}
          />
        </div>

        <div className="space-y-6 xl:sticky xl:top-24">
          {/* Botones de Acciones Rápidas */}
          <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Acciones Rápidas</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowIncomeModal(true)}
                className="w-full min-h-[44px] rounded-lg bg-green-600 px-4 py-3 text-white font-medium transition-colors hover:bg-green-500"
              >
                + Ingreso
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="w-full min-h-[44px] rounded-lg bg-red-600 px-4 py-3 text-white font-medium transition-colors hover:bg-red-500"
              >
                + Gasto
              </button>
              <button
                onClick={() => setShowInstallmentModal(true)}
                className="w-full min-h-[44px] rounded-lg bg-blue-600 px-4 py-3 text-white font-medium transition-colors hover:bg-blue-500"
              >
                + Cuota
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Cuotas Activas</h3>

            {installmentsError && (
              <p className="text-sm text-red-400 mb-3">⚠️ {installmentsError}</p>
            )}

            {installmentsLoading && installments.length === 0 && (
              <p className="text-sm text-slate-400">Cargando cuotas...</p>
            )}

            {!installmentsLoading && installments.length === 0 && (
              <p className="text-sm text-slate-400">No tienes cuotas registradas.</p>
            )}

            <div className="space-y-3">
              {installments
                .filter((item) => item.is_active)
                .slice(0, 3)
                .map((item) => {
                  const monthlyAmount = item.total_amount / item.num_installments;
                  const remaining = Math.max(item.num_installments - item.current_installment + 1, 0);
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-700 bg-slate-800/60 p-3"
                    >
                      <p className="text-sm font-medium text-white">{item.product_name}</p>
                      <p className="text-xs text-slate-300">
                        ${monthlyAmount.toLocaleString("es-CL")} x {item.num_installments} cuotas
                      </p>
                      <p className="text-xs text-slate-400 mb-2">Restantes: {remaining}</p>
                      <button
                        onClick={() => openInstallmentHistory(item)}
                        className="inline-flex min-h-[40px] items-center rounded-md px-3 py-2 text-sm text-blue-300 transition-colors hover:bg-slate-700/60 hover:text-blue-200"
                      >
                        Ver historial
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Placeholder for Goals/Tips */}
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <p className="text-sm text-slate-400">
              💡 Espacio para metas y/o tips financieros (FASE 2)
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Ingreso */}
      <Modal
        isOpen={showIncomeModal}
        title="+ Nuevo Ingreso"
        onClose={() => setShowIncomeModal(false)}
        size="md"
      >
        <IncomeForm
          onSubmit={handleIncomeSubmit}
          isLoading={incomeLoading}
          onClose={() => setShowIncomeModal(false)}
        />
      </Modal>

      {/* Modal de Gasto */}
      <Modal
        isOpen={showExpenseModal}
        title="+ Nuevo Gasto"
        onClose={() => setShowExpenseModal(false)}
        size="md"
      >
        <ExpenseForm
          onSubmit={handleExpenseSubmit}
          isLoading={expenseLoading}
          onClose={() => setShowExpenseModal(false)}
        />
      </Modal>

      {/* Modal de Cuota */}
      <Modal
        isOpen={showInstallmentModal}
        title="+ Nueva Cuota"
        onClose={() => setShowInstallmentModal(false)}
        size="md"
      >
        <InstallmentForm
          onSubmit={handleInstallmentSubmit}
          isLoading={installmentLoading}
          onClose={() => setShowInstallmentModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showInstallmentHistoryModal}
        title={`Historial - ${selectedInstallment?.product_name ?? "Cuota"}`}
        onClose={() => setShowInstallmentHistoryModal(false)}
        size="md"
      >
        <div className="space-y-3">
          {chargesLoading && <p className="text-sm text-slate-400">Cargando historial...</p>}

          {!chargesLoading && installmentCharges.length === 0 && (
            <p className="text-sm text-slate-400">Aun no hay cargos generados para esta cuota.</p>
          )}

          {!chargesLoading &&
            installmentCharges.map((charge) => (
              <div
                key={charge.id}
                className="rounded-lg border border-slate-700 bg-slate-800/60 p-3"
              >
                <p className="text-sm text-white font-medium">
                  Cuota {charge.installment_number} - ${Number(charge.amount).toLocaleString("es-CL")}
                </p>
                <p className="text-xs text-slate-300">Fecha de cargo: {charge.charge_date}</p>
                <p className="text-xs text-slate-400">
                  {charge.expense
                    ? `Gasto: ${charge.expense.merchant} (${charge.expense.category})`
                    : "Gasto aun no enlazado"}
                </p>
              </div>
            ))}
        </div>
      </Modal>
    </section>
  );
}
