"use client";

import { useState, useEffect, useCallback } from "react";
import { useHomes } from "@/hooks/useHomes";
import { HomeSelector } from "@/components/hogar/HomeSelector";
import { HomeDashboard } from "@/components/hogar/HomeDashboard";
import { CreateHomeModal } from "@/components/hogar/CreateHomeModal";
import { Loading } from "@/components/common/Loading";
import type { Home } from "@/types/database";

export default function HogarPage() {
  const { getHomes, createHome, isLoading } = useHomes();
  const [homes, setHomes] = useState<Home[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadHomes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getHomes();
      setHomes(data);
      // Auto-select first home if none selected
      if (data.length > 0 && !selectedHomeId) {
        setSelectedHomeId(data[0].id);
      }
    } catch {
      // error handled by hook
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadHomes();
  }, [loadHomes]);

  const handleCreateHome = async (data: { name: string; description?: string; currency?: string }) => {
    const newHome = await createHome(data);
    await loadHomes();
    setSelectedHomeId(newHome.id);
    setShowCreateModal(false);
  };

  const handleHomeDeleted = () => {
    setSelectedHomeId(null);
    loadHomes();
  };

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Hogar Compartido
        </h1>
        <p className="mt-2 text-slate-300">
          Gestiona gastos compartidos con tu familia o roommates
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-10">
          <Loading text="Cargando hogares..." />
        </div>
      ) : (
        <>
          <HomeSelector
            homes={homes}
            selectedHomeId={selectedHomeId}
            onSelect={setSelectedHomeId}
            onCreateNew={() => setShowCreateModal(true)}
          />

          {selectedHomeId && (
            <HomeDashboard
              key={selectedHomeId}
              homeId={selectedHomeId}
              onDeleted={handleHomeDeleted}
            />
          )}
        </>
      )}

      {showCreateModal && (
        <CreateHomeModal
          onSubmit={handleCreateHome}
          isLoading={isLoading}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </section>
  );
}
