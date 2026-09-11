"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Loading } from "@/components/common/Loading";
import { useEmailReview } from "@/hooks/useEmailReview";
import { useToast } from "@/hooks/useToast";

export default function EmailReviewPage() {
  const { items, total, isLoading, isRejectingId, error, fetchPending, rejectItem } =
    useEmailReview();
  const toast = useToast();

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

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
          <button
            type="button"
            onClick={() => fetchPending()}
            className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-600 px-3 py-2.5 text-sm text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-800"
          >
            Recargar
          </button>
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.subject || "Sin asunto"}</p>
                    <p className="mt-1 text-sm text-slate-300">{item.merchant || "Sin comercio"}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">{item.body_snippet || "Sin detalle"}</p>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200">
                      {item.predicted_category} • {Math.round(item.confidence * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => handleReject(item.id)}
                      disabled={isRejectingId === item.id}
                      className="inline-flex min-h-[36px] items-center rounded-lg border border-red-500/50 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRejectingId === item.id ? "Rechazando..." : "Rechazar"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
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


