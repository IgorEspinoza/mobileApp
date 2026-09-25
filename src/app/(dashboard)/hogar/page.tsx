"use client";

import { useState, useEffect, useCallback } from "react";
import { useHomes } from "@/hooks/useHomes";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { HomeSelector } from "@/components/hogar/HomeSelector";
import { HomeDashboard } from "@/components/hogar/HomeDashboard";
import { CreateHomeModal } from "@/components/hogar/CreateHomeModal";
import { FixedExpensesSection } from "@/components/hogar/FixedExpensesSection";
import { VariableExpensesSection } from "@/components/hogar/VariableExpensesSection";
import { Loading } from "@/components/common/Loading";
import type { Home } from "@/types/database";

type Tab = "variables" | "fijos" | "compartidos";

export default function HogarPage() {
  const { getHomes, createHome, isLoading } = useHomes();
  const {
    summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useDashboardSummary();

  const [homes, setHomes] = useState<Home[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("variables");

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

  const handleCreateHome = async (data: {
    name: string;
    description?: string;
    currency?: string;
  }) => {
    const newHome = await createHome(data);
    await loadHomes();
    setSelectedHomeId(newHome.id);
    setShowCreateModal(false);
  };

  const handleHomeDeleted = () => {
    setSelectedHomeId(null);
    loadHomes();
  };

  const tabs: { key: Tab; label: string; activeColor: string }[] = [
    {
      key: "variables",
      label: "🛒 Gastos Variables",
      activeColor: "bg-red-600",
    },
    {
      key: "fijos",
      label: "🏠 Gastos Fijos",
      activeColor: "bg-orange-600",
    },
    {
      key: "compartidos",
      label: "👥 Compartidos",
      activeColor: "bg-blue-600",
    },
  ];

  const showInitialLoading =
    summaryLoading && !summary && loading;

  return (
    <section className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white xl:text-4xl">
          Mi Dinero
        </h1>
        <p className="mt-2 text-slate-300 xl:text-base">
          Tu centro financiero personal
        </p>
      </div>

      {/* Summary Cards */}
      {summaryError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">
          <p>⚠️ {summaryError}</p>
        </div>
      )}

      {summary && (
        <SummaryCards
          month={summary.month}
          incomes={summary.incomes}
          expenses={summary.expenses}
          fixedExpenses={summary.fixedExpenses}
          totalExpenses={summary.totalExpenses}
          savings={summary.savings}
          freeBalance={summary.freeBalance}
          accumulated={summary.accumulated}
          isLoading={summaryLoading}
        />
      )}

      {summaryLoading && !summary && !showInitialLoading && (
        <SummaryCards
          month="Cargando..."
          incomes={0}
          expenses={0}
          savings={0}
          freeBalance={0}
          isLoading={true}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-800/50 p-1 border border-slate-700/50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? `${tab.activeColor} text-white shadow-lg`
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {showInitialLoading ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-10">
          <Loading text="Cargando..." />
        </div>
      ) : (
        <>
          {/* Variable Expenses Tab */}
          {activeTab === "variables" && (
            <VariableExpensesSection onDataChanged={refetchSummary} />
          )}

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
                  <p className="text-slate-400">
                    Crea un hogar para gestionar gastos compartidos
                  </p>
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
