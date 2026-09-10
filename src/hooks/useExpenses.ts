"use client";

import { useState } from "react";

export function useExpenses() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createExpense = async (data: {
    date: string;
    merchant: string;
    amount: number;
    category: string;
    description?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, is_shared: false }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al crear gasto");
      }

      return await res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateExpense = async (
    id: string,
    data: {
      date: string;
      merchant: string;
      amount: number;
      category: string;
      description?: string;
    }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al actualizar gasto");
      }

      return await res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteExpense = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al eliminar gasto");
      }

      return await res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { createExpense, updateExpense, deleteExpense, isLoading, error, setError };
}


