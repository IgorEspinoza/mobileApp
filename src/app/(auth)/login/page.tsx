"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

const REMEMBER_ME_KEY = "midinero_remember_email";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signInWithGoogle, isLoading, error, setError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Cargar email guardado al montar
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_ME_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("error") === "oauth_callback") {
      setError("No se pudo completar el inicio de sesion con Google");
    }
  }, [searchParams, setError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rememberMe) {
      localStorage.setItem(REMEMBER_ME_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }

    const success = await login(email, password);
    if (success) {
      router.push("/hogar");
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Iniciar sesión</h2>
        <p className="text-slate-400 text-sm mt-1">Bienvenido de vuelta 👋</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-300">Contraseña</label>
            <Link href="/reset-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
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

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember-me"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
          />
          <label htmlFor="remember-me" className="text-sm text-slate-400 cursor-pointer select-none">
            Recordar mi email
          </label>
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
              Ingresando...
            </span>
          ) : (
            "Ingresar"
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

      {/* Registro */}
      <p className="text-center text-slate-400 text-sm mt-6">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Regístrate gratis
        </Link>
      </p>
    </>
  );
}
