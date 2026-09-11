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
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async (params?: { page?: number; limit?: number; q?: string }) => {
    const nextPage = params?.page ?? page;
    const nextLimit = params?.limit ?? limit;
    const q = (params?.q || "").trim();

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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [limit, page]);

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

  return {
    items,
    total,
    page,
    limit,
    isLoading,
    isRejectingId,
    error,
    setError,
    fetchPending,
    rejectItem,
  };
}

