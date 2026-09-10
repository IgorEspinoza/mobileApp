"use client";

import { useCallback, useState } from "react";

export interface Installment {
  id: string;
  user_id: string;
  product_name: string;
  total_amount: number;
  num_installments: number;
  start_date: string;
  current_installment: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstallmentCharge {
  id: string;
  installment_id: string;
  installment_number: number;
  charge_date: string;
  amount: number;
  expense_id: string | null;
  created_at: string;
  expense: {
    id: string;
    date: string;
    merchant: string;
    category: string;
    description: string | null;
  } | null;
}

export function useInstallments() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInstallments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/installments");
      if (!res.ok) throw new Error("Error al cargar cuotas");
      const data = await res.json();
      setInstallments(data.installments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createInstallment = async (data: {
    product_name: string;
    total_amount: number;
    num_installments: number;
    start_date: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al crear cuota");
      }
      const created = await res.json();
      setInstallments((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateInstallment = async (
    id: string,
    data: {
      product_name: string;
      total_amount: number;
      num_installments: number;
      start_date: string;
      current_installment?: number;
      is_active?: boolean;
    }
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/installments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al actualizar cuota");
      }
      const updated = await res.json();
      setInstallments((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInstallment = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/installments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al eliminar cuota");
      }
      setInstallments((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    const item = installments.find((i) => i.id === id);
    if (!item) return;

    await updateInstallment(id, {
      product_name: item.product_name,
      total_amount: item.total_amount,
      num_installments: item.num_installments,
      start_date: item.start_date,
      current_installment: item.current_installment,
      is_active: !currentlyActive,
    });
  };

  const fetchInstallmentCharges = async (id: string) => {
    const res = await fetch(`/api/installments/${id}/charges`);
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Error al cargar historial de cuotas");
    }

    const payload = await res.json();
    return (payload.charges ?? []) as InstallmentCharge[];
  };

  return {
    installments,
    isLoading,
    error,
    setError,
    fetchInstallments,
    createInstallment,
    updateInstallment,
    deleteInstallment,
    toggleActive,
    fetchInstallmentCharges,
  };
}

