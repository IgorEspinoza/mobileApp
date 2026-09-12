"use client";

import { useCallback, useState } from "react";

export interface EmailReviewItem {
  id: string;
  email_import_id: string;
  subject: string;
  body_snippet: string | null;
  merchant: string;
  predicted_category: string;
  manual_category: string | null;
  confidence: number;
  status: string;
  expense_id: string | null;
  created_at: string;
  // Campos de la migracion 005. Pueden venir undefined si no esta aplicada.
  amount?: number | null;
  currency?: string | null;
  transaction_date?: string | null;
  detected_type?: "expense" | "income" | "installment" | null;
  num_installments?: number | null;
  source?: string | null;
  from_address?: string | null;
  email_imports: {
    email_address: string;
    provider: string;
    user_id: string;
  };
}

export type ReviewDestination = "expense" | "income" | "installment";

export interface ApprovePayload {
  destination: ReviewDestination;
  date: string;
  amount: number;
  merchant?: string;
  category?: string;
  source?: "salary" | "bonus" | "other";
  num_installments?: number;
  description?: string;
}

export interface SyncAutoResult {
  inserted: number;
  fetched: number;
  parsed: number;
  duplicated: number;
  ignored: number;
  failed: number;
  warnings: string[];
  timed_out?: boolean;
  used_bootstrap_fallback?: boolean;
  mailbox?: {
    requested: string;
    resolved: string;
    matchedBy: string;
  };
}

interface ListResponse {
  items: EmailReviewItem[];
  total: number;
  page: number;
  limit: number;
}

export function useEmailReview() {
  const [items, setItems] = useState<EmailReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [isRejectingId, setIsRejectingId] = useState<string | null>(null);
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // El parser asigna confianza alta a la mayoria de correos bancarios, asi que
  // quedan como `auto_classified`. Si filtraramos solo por `pending` el usuario
  // veria la lista vacia aunque la sincronizacion si haya guardado registros.
  const [status, setStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async (params?: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
  }) => {
    const nextPage = params?.page ?? page;
    const nextLimit = params?.limit ?? limit;
    const nextStatus = params?.status ?? status;
    const q = (params?.q ?? searchQuery).trim();

    try {
      setIsLoading(true);
      setError(null);

      const search = new URLSearchParams({
        status: nextStatus,
        page: String(nextPage),
        limit: String(nextLimit),
      });

      if (q) search.set("q", q);

      const res = await fetch(`/api/email/review?${search.toString()}`, {
        cache: "no-store",
      });

      const data = (await res.json()) as ListResponse | { error?: string };

      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Error al cargar revisiones");
      }

      const parsed = data as ListResponse;
      setItems(parsed.items ?? []);
      setTotal(parsed.total ?? 0);
      setPage(parsed.page ?? nextPage);
      setLimit(parsed.limit ?? nextLimit);
      setSearchQuery(q);
      setStatus(nextStatus);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, searchQuery, status]);

  const rejectItem = useCallback(async (id: string) => {
    try {
      setIsRejectingId(id);
      setError(null);

      const res = await fetch(`/api/email/review/${id}/reject`, {
        method: "POST",
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Error al rechazar clasificación");
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      return false;
    } finally {
      setIsRejectingId(null);
    }
  }, []);

  const approveItem = useCallback(async (id: string, payload: ApprovePayload) => {
    try {
      setIsApprovingId(id);
      setError(null);

      const res = await fetch(`/api/email/review/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Error al aprobar clasificación");
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      return false;
    } finally {
      setIsApprovingId(null);
    }
  }, []);

  const syncAuto = useCallback(async (params?: { limit?: number; unseenOnly?: boolean; mailbox?: string; days?: number }) => {
    try {
      setIsSyncing(true);
      setError(null);

      const search = new URLSearchParams();
      if (params?.limit) search.set("limit", String(params.limit));
      if (typeof params?.unseenOnly === "boolean") {
        search.set("unseenOnly", params.unseenOnly ? "true" : "false");
      }
      if (params?.mailbox) search.set("mailbox", params.mailbox);
      if (params?.days) search.set("days", String(params.days));

      const qs = search.toString();
      const res = await fetch(`/api/email/sync/auto${qs ? `?${qs}` : ""}`, {
        method: "POST",
      });

      const data = (await res.json()) as {
        error?: string;
        stats?: {
          inserted?: number;
          fetched?: number;
          parsed?: number;
          duplicated?: number;
          ignored?: number;
          failed?: number;
          timed_out?: boolean;
          used_bootstrap_fallback?: boolean;
        };
        mailbox?: {
          requested: string;
          resolved: string;
          matchedBy: string;
        };
        warnings?: string[];
      };

      if (!res.ok) {
        throw new Error(data.error || "Error al sincronizar correos");
      }

      await fetchPending({ page: 1 });
      return {
        inserted: data.stats?.inserted ?? 0,
        fetched: data.stats?.fetched ?? 0,
        parsed: data.stats?.parsed ?? 0,
        duplicated: data.stats?.duplicated ?? 0,
        ignored: data.stats?.ignored ?? 0,
        failed: data.stats?.failed ?? 0,
        timed_out: data.stats?.timed_out,
        used_bootstrap_fallback: data.stats?.used_bootstrap_fallback,
        mailbox: data.mailbox,
        warnings: data.warnings ?? [],
      } satisfies SyncAutoResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      return {
        inserted: -1,
        fetched: 0,
        parsed: 0,
        duplicated: 0,
        ignored: 0,
        failed: 1,
        warnings: [message],
      } satisfies SyncAutoResult;
    } finally {
      setIsSyncing(false);
    }
  }, [fetchPending]);

  const approveAll = useCallback(async (ids?: string[]) => {
    try {
      setIsApprovingAll(true);
      setError(null);

      const res = await fetch("/api/email/review/approve-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids && ids.length > 0 ? { ids } : {}),
      });

      const data = (await res.json()) as {
        error?: string;
        stats?: {
          candidates?: number;
          approved?: number;
          skipped?: number;
          failed?: number;
        };
        warnings?: string[];
      };

      if (!res.ok) {
        throw new Error(data.error || "Error al aprobar en bloque");
      }

      await fetchPending({ page: 1 });

      return {
        approved: data.stats?.approved ?? 0,
        skipped: data.stats?.skipped ?? 0,
        failed: data.stats?.failed ?? 0,
        candidates: data.stats?.candidates ?? 0,
        warnings: data.warnings ?? [],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      return { approved: -1, skipped: 0, failed: 1, candidates: 0, warnings: [message] };
    } finally {
      setIsApprovingAll(false);
    }
  }, [fetchPending]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    items,
    total,
    page,
    limit,
    isLoading,
    isRejectingId,
    isApprovingId,
    isApprovingAll,
    isSyncing,
    searchQuery,
    status,
    totalPages,
    error,
    setError,
    setSearchQuery,
    setStatus,
    fetchPending,
    syncAuto,
    rejectItem,
    approveItem,
    approveAll,
  };
}

