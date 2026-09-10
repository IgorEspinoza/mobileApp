"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar el email");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Email enviado
        </h2>
        <p className="text-slate-400 text-sm">
          Revisa tu bandeja de entrada en{" "}
          <span className="text-white font-medium">{email}</span>. Te enviamos
          un enlace para restablecer tu contraseña.
        </p>
        <Link
          href="/auth/login"
          className="inline-block mt-6 text-blue-400 hover:text-blue-300 text-sm transition-colors"
        >
          ← Volver al login
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">
          Recuperar contraseña
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Te enviaremos un enlace para restablecerla
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            autoComplete="email"
            className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed
                     text-white font-semibold transition-all shadow-lg shadow-blue-600/30 mt-2"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Enviando...
            </span>
          ) : (
            "Enviar enlace"
          )}
        </button>
      </form>

      <p className="text-center text-slate-400 text-sm mt-6">
        <Link
          href="/auth/login"
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          ← Volver al login
        </Link>
      </p>
    </>
  );
}

