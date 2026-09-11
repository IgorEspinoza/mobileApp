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
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async (params?: { page?: number; limit?: number; q?: string }) => {
    const nextPage = params?.page ?? page;
    const nextLimit = params?.limit ?? limit;
    const q = (params?.q ?? searchQuery).trim();

    try {
      setIsLoading(true);
      setError(null);

      const search = new URLSearchParams({
        status: "pending",
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, searchQuery]);

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

  const syncAuto = useCallback(async (params?: { limit?: number; unseenOnly?: boolean }) => {
    try {
      setIsSyncing(true);
      setError(null);

      const search = new URLSearchParams();
      if (params?.limit) search.set("limit", String(params.limit));
      if (params?.unseenOnly === false) search.set("unseenOnly", "false");

      const qs = search.toString();
      const res = await fetch(`/api/email/sync/auto${qs ? `?${qs}` : ""}`, {
        method: "POST",
      });

      const data = (await res.json()) as {
        error?: string;
        stats?: { inserted?: number };
      };

      if (!res.ok) {
        throw new Error(data.error || "Error al sincronizar correos");
      }

      await fetchPending({ page: 1 });
      return data.stats?.inserted ?? 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      return -1;
    } finally {
      setIsSyncing(false);
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
    isSyncing,
    searchQuery,
    totalPages,
    error,
    setError,
    setSearchQuery,
    fetchPending,
    syncAuto,
    rejectItem,
    approveItem,
  };
}

