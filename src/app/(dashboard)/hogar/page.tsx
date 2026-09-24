"use client";

import { useState, useEffect, useCallback } from "react";
import { useHomes } from "@/hooks/useHomes";
import { HomeSelector } from "@/components/hogar/HomeSelector";
import { HomeDashboard } from "@/components/hogar/HomeDashboard";
import { CreateHomeModal } from "@/components/hogar/CreateHomeModal";
import { FixedExpensesSection } from "@/components/hogar/FixedExpensesSection";
import { Loading } from "@/components/common/Loading";
import type { Home } from "@/types/database";

export default function HogarPage() {
  const { getHomes, createHome, isLoading } = useHomes();
  const [homes, setHomes] = useState<Home[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"fijos" | "compartidos">("fijos");

  const loadHomes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getHomes();
      setHomes(data);
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
          Hogar
        </h1>
        <p className="mt-2 text-slate-300">
          Gastos fijos y compartidos de tu hogar
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-800/50 p-1 border border-slate-700/50">
        <button
          type="button"
          onClick={() => setActiveTab("fijos")}
          className={`flex-1 min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === "fijos"
              ? "bg-orange-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
          }`}
        >
          🏠 Gastos Fijos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("compartidos")}
          className={`flex-1 min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === "compartidos"
              ? "bg-blue-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
          }`}
        >
          👥 Gastos Compartidos
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-10">
          <Loading text="Cargando..." />
        </div>
      ) : (
        <>
          {/* Fixed Expenses Tab */}
          {activeTab === "fijos" && (
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6">
              <FixedExpensesSection homeId={selectedHomeId ?? undefined} />
            </div>
          )}

          {/* Shared Expenses Tab */}
          {activeTab === "compartidos" && (
            <>
              <HomeSelector
                homes={homes}
                selectedHomeId={selectedHomeId}
                onSelect={setSelectedHomeId}
                onCreateNew={() => setShowCreateModal(true)}
              />

              {selectedHomeId ? (
                <HomeDashboard
                  key={selectedHomeId}
                  homeId={selectedHomeId}
                  onDeleted={handleHomeDeleted}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-8 text-center">
                  <p className="text-slate-400">Crea un hogar para gestionar gastos compartidos</p>
                </div>
              )}
            </>
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
