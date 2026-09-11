"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loading } from "@/components/common/Loading";
import { useEmailReview } from "@/hooks/useEmailReview";
import { useToast } from "@/hooks/useToast";

const CATEGORIES = [
  "Arriendo",
  "Gastos Comunes",
  "Supermercado",
  "Transporte",
  "Delivery",
  "Comida Fuera",
  "Salud",
  "Tecnología",
  "Entretenimiento",
  "Hogar",
  "Servicios",
  "Otros",
] as const;

type Destination = "expense" | "income" | "installment";

interface DraftOverride {
  destination: Destination;
  amount: string;
  date: string;
  merchant: string;
  category: string;
  source: "salary" | "bonus" | "other";
  num_installments: string;
}

export default function EmailReviewPage() {
  const {
    items,
    total,
    page,
    totalPages,
    isLoading,
    isRejectingId,
    isApprovingId,
    isSyncing,
    searchQuery,
    error,
    fetchPending,
    syncAuto,
    rejectItem,
    approveItem,
    setSearchQuery,
  } = useEmailReview();
  const toast = useToast();
  const [draftById, setDraftById] = useState<Record<string, DraftOverride>>({});

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const getDraft = (id: string): DraftOverride => {
    return (
      draftById[id] || {
        destination: "expense",
        amount: "",
        date: today,
        merchant: "",
        category: "Otros",
        source: "other",
        num_installments: "3",
      }
    );
  };

  const updateDraft = (id: string, patch: Partial<DraftOverride>) => {
    setDraftById((prev) => ({ ...prev, [id]: { ...getDraft(id), ...patch } }));
  };

  const handleApprove = async (id: string) => {
    const target = items.find((item) => item.id === id);
    if (!target) return;

    const draft = getDraft(id);
    const amount = Number.parseFloat(draft.amount || "0");

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Monto inválido para aprobar");
      return;
    }

    const payload = {
      destination: draft.destination,
      date: draft.date,
      amount,
      merchant: draft.merchant || target.merchant || target.subject,
      category: draft.destination === "expense" || draft.destination === "installment" ? draft.category : undefined,
      source: draft.destination === "income" ? draft.source : undefined,
      num_installments:
        draft.destination === "installment"
          ? Number.parseInt(draft.num_installments || "0", 10)
          : undefined,
      description: target.body_snippet || target.subject,
    };

    const ok = await approveItem(id, payload);
    if (ok) {
      toast.success("Clasificación aprobada y registrada");
    } else {
      toast.error("No se pudo aprobar la clasificación");
    }
  };

  const handleSearch = async () => {
    await fetchPending({ page: 1, q: searchQuery });
  };

  const handleSyncAuto = async () => {
    const inserted = await syncAuto({ limit: 30 });
    if (inserted >= 0) {
      toast.success(inserted > 0 ? `Sincronización OK: ${inserted} nuevo(s)` : "Sincronización OK: sin correos nuevos");
    } else {
      toast.error("No se pudo sincronizar el correo automáticamente");
    }
  };

  const goPage = async (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    await fetchPending({ page: nextPage });
  };

  const handleReject = async (id: string) => {
    const ok = await rejectItem(id);
    if (ok) {
      toast.success("Clasificación rechazada");
    } else {
      toast.error("No se pudo rechazar la clasificación");
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Revisión de correos</h1>
        <p className="mt-2 text-slate-300">
          Correos ambiguos pendientes de clasificación manual.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-300">Pendientes: <span className="font-semibold text-white">{total}</span></p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por asunto o comercio"
              className="min-h-[40px] rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-600 px-3 py-2.5 text-sm text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-800"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={handleSyncAuto}
              disabled={isSyncing}
              className="inline-flex min-h-[40px] items-center rounded-lg border border-emerald-500/50 px-3 py-2.5 text-sm text-emerald-200 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncing ? "Sincronizando..." : "Sincronizar correo"}
            </button>
            <button
              type="button"
              onClick={() => fetchPending()}
              className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-600 px-3 py-2.5 text-sm text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-800"
            >
              Recargar
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="mt-6">
            <Loading text="Cargando correos pendientes..." />
          </div>
        ) : items.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">No hay correos pendientes por revisar.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4"
              >
                {/** Formulario mínimo para decidir destino y editar campos clave */}
                {(() => {
                  const draft = getDraft(item.id);
                  return (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.subject || "Sin asunto"}</p>
                    <p className="mt-1 text-sm text-slate-300">{item.merchant || "Sin comercio"}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">{item.body_snippet || "Sin detalle"}</p>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <select
                        value={draft.destination}
                        onChange={(e) => updateDraft(item.id, { destination: e.target.value as Destination })}
                        className="min-h-[36px] rounded-lg border border-slate-600 bg-slate-800/70 px-2 text-xs text-slate-100"
                      >
                        <option value="expense">Gasto</option>
                        <option value="income">Ingreso</option>
                        <option value="installment">Cuota</option>
                      </select>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Monto"
                        value={draft.amount}
                        onChange={(e) => updateDraft(item.id, { amount: e.target.value })}
                        className="min-h-[36px] rounded-lg border border-slate-600 bg-slate-800/70 px-2 text-xs text-slate-100 placeholder:text-slate-400"
                      />

                      <input
                        type="date"
                        value={draft.date}
                        onChange={(e) => updateDraft(item.id, { date: e.target.value })}
                        className="min-h-[36px] rounded-lg border border-slate-600 bg-slate-800/70 px-2 text-xs text-slate-100"
                      />

                      <input
                        type="text"
                        placeholder="Comercio / producto"
                        value={draft.merchant}
                        onChange={(e) => updateDraft(item.id, { merchant: e.target.value })}
                        className="min-h-[36px] rounded-lg border border-slate-600 bg-slate-800/70 px-2 text-xs text-slate-100 placeholder:text-slate-400 sm:col-span-2"
                      />

                      {draft.destination === "income" ? (
                        <select
                          value={draft.source}
                          onChange={(e) => updateDraft(item.id, { source: e.target.value as "salary" | "bonus" | "other" })}
                          className="min-h-[36px] rounded-lg border border-slate-600 bg-slate-800/70 px-2 text-xs text-slate-100"
                        >
                          <option value="salary">Sueldo</option>
                          <option value="bonus">Bono</option>
                          <option value="other">Otro</option>
                        </select>
                      ) : (
                        <select
                          value={draft.category}
                          onChange={(e) => updateDraft(item.id, { category: e.target.value })}
                          className="min-h-[36px] rounded-lg border border-slate-600 bg-slate-800/70 px-2 text-xs text-slate-100"
                        >
                          {CATEGORIES.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      )}

                      {draft.destination === "installment" && (
                        <input
                          type="number"
                          min="2"
                          step="1"
                          value={draft.num_installments}
                          onChange={(e) => updateDraft(item.id, { num_installments: e.target.value })}
                          placeholder="N° cuotas"
                          className="min-h-[36px] rounded-lg border border-slate-600 bg-slate-800/70 px-2 text-xs text-slate-100 placeholder:text-slate-400"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200">
                      {item.predicted_category} • {Math.round(item.confidence * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApprove(item.id)}
                      disabled={isApprovingId === item.id}
                      className="inline-flex min-h-[36px] items-center rounded-lg border border-emerald-500/50 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isApprovingId === item.id ? "Aprobando..." : "Aprobar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(item.id)}
                      disabled={isRejectingId === item.id || isApprovingId === item.id}
                      className="inline-flex min-h-[36px] items-center rounded-lg border border-red-500/50 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRejectingId === item.id ? "Rechazando..." : "Rechazar"}
                    </button>
                  </div>
                </div>
                  );
                })()}
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => goPage(page - 1)}
              disabled={page <= 1 || isLoading}
              className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-300">Página {page} de {totalPages}</span>
            <button
              type="button"
              onClick={() => goPage(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Siguiente
            </button>
          </div>
        )}

        <Link
          href="/transactions"
          className="mt-4 inline-flex min-h-[40px] items-center rounded-lg border border-slate-600 px-3 py-2.5 text-sm text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-800"
        >
          Volver a transacciones
        </Link>
      </div>
    </section>
  );
}


