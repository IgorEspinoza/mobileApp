import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500 mb-4 shadow-lg shadow-blue-500/30">
            <span className="text-3xl">💰</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            MiDinero AI
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Asistente financiero personal
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl p-8">
          {children}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © 2026 MiDinero AI — Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}

