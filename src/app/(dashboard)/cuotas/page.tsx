"use client";

import { useEffect, useState, useMemo } from "react";
import {
  useInstallments,
  type Installment,
  type InstallmentCharge,
} from "@/hooks/useInstallments";
import {
  InstallmentForm,
  type InstallmentFormData,
} from "@/components/forms/InstallmentForm";
import { Modal } from "@/components/common/Modal";
import { useToast } from "@/hooks/useToast";

function formatCLP(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-CL")}`;
}

function getMonthLabel(dateStr: string, offsetMonths: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setMonth(d.getMonth() + offsetMonths);
  return d.toLocaleDateString("es-CL", { month: "short", year: "numeric" });
}

export default function CuotasPage() {
  const {
    installments,
    isLoading,
    error,
    setError,
    fetchInstallments,
    createInstallment,
    updateInstallment,
    deleteInstallment,
    fetchInstallmentCharges,
  } = useInstallments();
  const toast = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);
  const [installmentCharges, setInstallmentCharges] = useState<
    InstallmentCharge[]
  >([]);
  const [chargesLoading, setChargesLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [filter, setFilter] = useState<"active" | "completed" | "all">(
    "active"
  );

  useEffect(() => {
    fetchInstallments();
  }, [fetchInstallments]);

  const filtered = useMemo(() => {
    if (filter === "active") return installments.filter((i) => i.is_active);
    if (filter === "completed") return installments.filter((i) => !i.is_active);
    return installments;
  }, [installments, filter]);

  const summary = useMemo(() => {
    const active = installments.filter((i) => i.is_active);
    const totalRemaining = active.reduce((sum, i) => {
      const remaining = Math.max(
        i.num_installments - i.current_installment + 1,
        0
      );
      const monthly = i.total_amount / i.num_installments;
      return sum + monthly * remaining;
    }, 0);
    const monthlyTotal = active.reduce((sum, i) => {
      return sum + i.total_amount / i.num_installments;
    }, 0);
    return { count: active.length, totalRemaining, monthlyTotal };
  }, [installments]);

  const handleCreate = async (data: InstallmentFormData) => {
    setCreateLoading(true);
    try {
      await createInstallment({
        product_name: data.product_name,
        total_amount: data.total_amount,
        num_installments: data.num_installments,
        start_date: data.start_date,
      });
      setShowCreateModal(false);
      toast.success("Cuota creada exitosamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear cuota");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAdvanceCuota = async (item: Installment) => {
    if (item.current_installment >= item.num_installments) {
      // Mark as completed
      await updateInstallment(item.id, {
        ...item,
        is_active: false,
      });
      toast.success(`${item.product_name} marcada como completada`);
      return;
    }
    await updateInstallment(item.id, {
      ...item,
      current_installment: item.current_installment + 1,
    });
    toast.success(`Cuota ${item.current_installment} de ${item.product_name} marcada como pagada`);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInstallment(id);
      toast.success("Cuota eliminada");
    } catch {
      toast.error("Error al eliminar cuota");
    }
  };

  const openHistory = async (item: Installment) => {
    setSelectedInstallment(item);
    setShowHistoryModal(true);
    setChargesLoading(true);
    try {
      const charges = await fetchInstallmentCharges(item.id);
      setInstallmentCharges(charges);
    } catch {
      setInstallmentCharges([]);
    } finally {
      setChargesLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Cuotas Pendientes</h1>
        <p className="text-sm text-slate-400 mt-1">
          Administra tus compras en cuotas y lleva el control de los pagos
          mensuales.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wide">
            Cuotas activas
          </p>
          <p className="text-2xl font-bold text-white mt-1">
            {summary.count}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wide">
            Cargo mensual estimado
          </p>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {formatCLP(summary.monthlyTotal)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wide">
            Deuda total restante
          </p>
          <p className="text-2xl font-bold text-red-400 mt-1">
            {formatCLP(summary.totalRemaining)}
          </p>
        </div>
      </div>

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {(["active", "completed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {f === "active"
              ? "Activas"
              : f === "completed"
                ? "Completadas"
                : "Todas"}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setShowCreateModal(true)}
          className="min-h-[44px] rounded-lg bg-blue-600 px-5 py-2.5 text-sm text-white font-medium transition-colors hover:bg-blue-500"
        >
          + Nueva Cuota
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-700/50 p-4">
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-400 underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && filtered.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-12">
          Cargando cuotas...
        </p>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-400 text-lg mb-2">
            {filter === "active"
              ? "No tienes cuotas activas"
              : filter === "completed"
                ? "No tienes cuotas completadas"
                : "No tienes cuotas registradas"}
          </p>
          <p className="text-slate-500 text-sm">
            Las compras en cuotas detectadas en tus correos aparecerán aquí
            automáticamente.
          </p>
        </div>
      )}

      {/* Installment list */}
      <div className="space-y-4">
        {filtered.map((item) => {
          const monthly = item.total_amount / item.num_installments;
          const paid = item.current_installment - 1;
          const remaining = Math.max(item.num_installments - paid, 0);
          const progress = (paid / item.num_installments) * 100;
          const isLast = item.current_installment >= item.num_installments;

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 sm:p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Left info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-white truncate">
                      {item.product_name}
                    </h3>
                    {!item.is_active && (
                      <span className="shrink-0 rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-400 border border-green-700/40">
                        Completada
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-300">
                    Monto total: {formatCLP(item.total_amount)} —{" "}
                    {formatCLP(monthly)}/mes x {item.num_installments} cuotas
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Inicio: {item.start_date}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>
                        Cuota {Math.min(item.current_installment, item.num_installments)} de{" "}
                        {item.num_installments}
                      </span>
                      <span>
                        {paid} pagadas — {remaining} restantes
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          item.is_active ? "bg-blue-500" : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Monthly schedule preview */}
                  {item.is_active && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {Array.from({ length: item.num_installments }).map(
                        (_, idx) => {
                          const isPaid = idx < paid;
                          const isCurrent = idx === paid;
                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium ${
                                isPaid
                                  ? "bg-green-900/40 text-green-400 border border-green-700/30"
                                  : isCurrent
                                    ? "bg-amber-900/40 text-amber-300 border border-amber-600/40"
                                    : "bg-slate-800 text-slate-500 border border-slate-700/40"
                              }`}
                              title={getMonthLabel(item.start_date, idx)}
                            >
                              {getMonthLabel(item.start_date, idx)}
                            </span>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>

                {/* Right actions */}
                <div className="flex flex-row sm:flex-col items-center gap-2 shrink-0">
                  {item.is_active && (
                    <button
                      onClick={() => handleAdvanceCuota(item)}
                      className="min-h-[40px] rounded-lg bg-green-700 px-4 py-2 text-sm text-white font-medium transition-colors hover:bg-green-600 w-full sm:w-auto"
                    >
                      {isLast ? "Finalizar" : "Marcar pagada"}
                    </button>
                  )}
                  <button
                    onClick={() => openHistory(item)}
                    className="min-h-[40px] rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 w-full sm:w-auto"
                  >
                    Historial
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="min-h-[40px] rounded-lg border border-red-800/50 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-900/30 w-full sm:w-auto"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        title="+ Nueva Cuota"
        onClose={() => setShowCreateModal(false)}
        size="md"
      >
        <InstallmentForm
          onSubmit={handleCreate}
          isLoading={createLoading}
          onClose={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={showHistoryModal}
        title={`Historial — ${selectedInstallment?.product_name ?? "Cuota"}`}
        onClose={() => setShowHistoryModal(false)}
        size="md"
      >
        <div className="space-y-3">
          {chargesLoading && (
            <p className="text-sm text-slate-400">Cargando historial...</p>
          )}

          {!chargesLoading && installmentCharges.length === 0 && (
            <p className="text-sm text-slate-400">
              Aún no hay cargos registrados para esta cuota.
            </p>
          )}

          {!chargesLoading &&
            installmentCharges.map((charge) => (
              <div
                key={charge.id}
                className="rounded-lg border border-slate-700 bg-slate-800/60 p-3"
              >
                <p className="text-sm text-white font-medium">
                  Cuota {charge.installment_number} —{" "}
                  {formatCLP(Number(charge.amount))}
                </p>
                <p className="text-xs text-slate-300">
                  Fecha de cargo: {charge.charge_date}
                </p>
                <p className="text-xs text-slate-400">
                  {charge.expense
                    ? `Gasto: ${charge.expense.merchant} (${charge.expense.category})`
                    : "Gasto aún no enlazado"}
                </p>
              </div>
            ))}
        </div>
      </Modal>
    </>
  );
}
