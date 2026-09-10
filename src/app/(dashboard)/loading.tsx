import { Loading } from "@/components/common/Loading";

export default function DashboardLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loading size="lg" text="Cargando dashboard..." />
    </div>
  );
}

