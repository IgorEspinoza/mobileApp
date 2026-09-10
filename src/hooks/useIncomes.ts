"use client";

import { useState } from "react";

export function useIncomes() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createIncome = async (data: {
    date: string;
    amount: number;
    source: string;
    description?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/incomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al crear ingreso");
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

  const updateIncome = async (
    id: string,
    data: {
      date: string;
      amount: number;
      source: string;
      description?: string;
    }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/incomes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al actualizar ingreso");
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

  const deleteIncome = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/incomes/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al eliminar ingreso");
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

  return { createIncome, updateIncome, deleteIncome, isLoading, error, setError };
}


