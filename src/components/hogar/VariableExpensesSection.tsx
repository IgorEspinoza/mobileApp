"use client";

import { useEffect, useState } from "react";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { Modal } from "@/components/common/Modal";
import { IncomeForm, type IncomeFormData } from "@/components/forms/IncomeForm";
import { ExpenseForm, type ExpenseFormData } from "@/components/forms/ExpenseForm";
import {
  InstallmentForm,
  type InstallmentFormData,
} from "@/components/forms/InstallmentForm";
import { useRecentTransactions } from "@/hooks/useRecentTransactions";
import { useIncomes } from "@/hooks/useIncomes";
import { useExpenses } from "@/hooks/useExpenses";
import {
  useInstallments,
  type Installment,
  type InstallmentCharge,
} from "@/hooks/useInstallments";
import { useToast } from "@/hooks/useToast";

interface VariableExpensesSectionProps {
  onDataChanged?: () => void;
}

export function VariableExpensesSection({
  onDataChanged,
}: VariableExpensesSectionProps) {
  const {
    transactions,
    isLoading: txLoading,
    refetch: refetchTransactions,
  } = useRecentTransactions(10);
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
  const [showInstallmentHistoryModal, setShowInstallmentHistoryModal] =
    useState(false);
  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);
  const [installmentCharges, setInstallmentCharges] = useState<
    InstallmentCharge[]
  >([]);
  const [chargesLoading, setChargesLoading] = useState(false);

  useEffect(() => {
    void fetchInstallments();
  }, [fetchInstallments]);

  const refreshAll = async () => {
    await refetchTransactions();
    onDataChanged?.();
  };

  const handleIncomeSubmit = async (data: IncomeFormData) => {
    try {
      await createIncome(data);
      toast.success("✅ Ingreso registrado exitosamente");
      setShowIncomeModal(false);
      await refreshAll();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar ingreso"
      );
    }
  };

  const handleExpenseSubmit = async (data: ExpenseFormData) => {
    try {
      await createExpense(data);
      toast.success("✅ Gasto registrado exitosamente");
      setShowExpenseModal(false);
      await refreshAll();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar gasto"
      );
    }
  };

  const handleInstallmentSubmit = async (data: InstallmentFormData) => {
    try {
      await createInstallment(data);
      toast.success("✅ Cuota registrada exitosamente");
      setShowInstallmentModal(false);
      await Promise.all([refreshAll(), fetchInstallments()]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar cuota"
      );
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
      toast.error(
        err instanceof Error
          ? err.message
          : "Error al cargar historial de cuota"
      );
      setInstallmentCharges([]);
    } finally {
      setChargesLoading(false);
    }
  };

  return (
    <>
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowIncomeModal(true)}
          className="min-h-[44px] rounded-lg bg-green-600 px-5 py-2.5 text-sm text-white font-medium transition-colors hover:bg-green-500"
        >
          + Ingreso
        </button>
        <button
          onClick={() => setShowExpenseModal(true)}
          className="min-h-[44px] rounded-lg bg-red-600 px-5 py-2.5 text-sm text-white font-medium transition-colors hover:bg-red-500"
        >
          + Gasto
        </button>
        <button
          onClick={() => setShowInstallmentModal(true)}
          className="min-h-[44px] rounded-lg bg-blue-600 px-5 py-2.5 text-sm text-white font-medium transition-colors hover:bg-blue-500"
        >
          + Cuota
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4 xl:items-start">
        {/* Transactions */}
        <div className="xl:col-span-3">
          <RecentTransactions
            transactions={transactions}
            isLoading={txLoading}
          />
        </div>

        {/* Installments sidebar */}
        <div className="space-y-6 xl:sticky xl:top-24">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Cuotas Activas
            </h3>

            {installmentsError && (
              <p className="text-sm text-red-400 mb-3">
                ⚠️ {installmentsError}
              </p>
            )}

            {installmentsLoading && installments.length === 0 && (
              <p className="text-sm text-slate-400">Cargando cuotas...</p>
            )}

            {!installmentsLoading && installments.length === 0 && (
              <p className="text-sm text-slate-400">
                No tienes cuotas registradas.
              </p>
            )}

            <div className="space-y-3">
              {installments
                .filter((item) => item.is_active)
                .slice(0, 3)
                .map((item) => {
                  const monthlyAmount =
                    item.total_amount / item.num_installments;
                  const remaining = Math.max(
                    item.num_installments - item.current_installment + 1,
                    0
                  );
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-700 bg-slate-800/60 p-3"
                    >
                      <p className="text-sm font-medium text-white">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-slate-300">
                        ${monthlyAmount.toLocaleString("es-CL")} x{" "}
                        {item.num_installments} cuotas
                      </p>
                      <p className="text-xs text-slate-400 mb-2">
                        Restantes: {remaining}
                      </p>
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

      {/* Modal de Historial de Cuota */}
      <Modal
        isOpen={showInstallmentHistoryModal}
        title={`Historial - ${selectedInstallment?.product_name ?? "Cuota"}`}
        onClose={() => setShowInstallmentHistoryModal(false)}
        size="md"
      >
        <div className="space-y-3">
          {chargesLoading && (
            <p className="text-sm text-slate-400">Cargando historial...</p>
          )}

          {!chargesLoading && installmentCharges.length === 0 && (
            <p className="text-sm text-slate-400">
              Aun no hay cargos generados para esta cuota.
            </p>
          )}

          {!chargesLoading &&
            installmentCharges.map((charge) => (
              <div
                key={charge.id}
                className="rounded-lg border border-slate-700 bg-slate-800/60 p-3"
              >
                <p className="text-sm text-white font-medium">
                  Cuota {charge.installment_number} - $
                  {Number(charge.amount).toLocaleString("es-CL")}
                </p>
                <p className="text-xs text-slate-300">
                  Fecha de cargo: {charge.charge_date}
                </p>
                <p className="text-xs text-slate-400">
                  {charge.expense
                    ? `Gasto: ${charge.expense.merchant} (${charge.expense.category})`
                    : "Gasto aun no enlazado"}
                </p>
              </div>
            ))}
        </div>
      </Modal>
    </>
  );
}
