"use client";

import { useRecentTransactions } from "@/hooks/useRecentTransactions";
import { TransactionsListView } from "@/components/transactions/TransactionsListView";
import { Loading } from "@/components/common/Loading";

export default function TransactionsPage() {
  const { transactions, isLoading: txLoading, refetch } = useRecentTransactions(100);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Mis Transacciones
        </h1>
        <p className="mt-2 text-slate-300">
          Historial completo de ingresos y gastos
        </p>
      </div>

      {txLoading && transactions.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-10">
          <Loading text="Cargando transacciones..." />
        </div>
      ) : (
        <TransactionsListView
          transactions={transactions}
          isLoading={txLoading}
          onRefresh={refetch}
        />
      )}
    </section>
  );
}
