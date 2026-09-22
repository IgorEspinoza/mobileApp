"use client";

import { useState } from "react";
import type { Home, HomeMember, User } from "@/types/database";

export type HomeWithMembers = Home & {
  members: (HomeMember & { user: Pick<User, "id" | "full_name" | "email" | "avatar_url"> })[];
};

export function useHomes() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getHomes = async (): Promise<Home[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/homes");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al obtener hogares");
      }
      const data = await res.json();
      return data.homes;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getHome = async (id: string): Promise<HomeWithMembers> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/homes/${id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al obtener hogar");
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

  const createHome = async (data: { name: string; description?: string; currency?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/homes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al crear hogar");
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

  const updateHome = async (id: string, data: { name?: string; description?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/homes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al actualizar hogar");
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

  const deleteHome = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/homes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al eliminar hogar");
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

  const inviteMember = async (homeId: string, data: { email: string; role?: "owner" | "member" }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/homes/${homeId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al invitar miembro");
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

  const removeMember = async (homeId: string, memberId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/homes/${homeId}/members?memberId=${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al eliminar miembro");
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

  return {
    getHomes,
    getHome,
    createHome,
    updateHome,
    deleteHome,
    inviteMember,
    removeMember,
    isLoading,
    error,
    setError,
  };
}
