import { Loading } from "@/components/common/Loading";

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-12">
      <Loading size="lg" text="Cargando autenticación..." />
    </div>
  );
}

