"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const { register, signInWithGoogle, isLoading, error, setError } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const ok = await register(email, password, fullName);
    if (ok) {
      setSuccess(true);
      // Supabase puede requerir confirmación de email; si no, redirigir directo
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  };

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-semibold text-white mb-2">
          ¡Cuenta creada!
        </h2>
        <p className="text-slate-400 text-sm">
          Revisa tu email para confirmar tu cuenta y luego{" "}
          <Link href="/auth/login" className="text-blue-400">
            inicia sesión
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Crear cuenta</h2>
        <p className="text-slate-400 text-sm mt-1">
          Empieza a controlar tus finanzas hoy 🚀
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Nombre completo
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Igor Espinoza"
            required
            autoComplete="name"
            className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Email */}
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

        {/* Contraseña */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {/* Confirmar Contraseña */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Confirmar contraseña
          </label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite tu contraseña"
            required
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Botón */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed
                     text-white font-semibold transition-all shadow-lg shadow-blue-600/30 mt-2"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creando cuenta...
            </span>
          ) : (
            "Crear cuenta"
          )}
        </button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs text-slate-400 uppercase tracking-wide">
            <span className="bg-slate-900 px-2">o continua con</span>
          </div>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={async () => {
            setError(null);
            await signInWithGoogle();
          }}
          className="w-full py-3 px-4 rounded-xl border border-slate-600 bg-slate-800/60 hover:bg-slate-700/60 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition-all"
        >
          Continuar con Google
        </button>
      </form>

      {/* Login */}
      <p className="text-center text-slate-400 text-sm mt-6">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/auth/login"
          className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          Inicia sesión
        </Link>
      </p>
    </>
  );
}

