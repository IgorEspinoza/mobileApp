"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import type { User } from "@/types/database";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

export function useAuth() {
  const router = useRouter();
  const { user, isLoading, error, setUser, setLoading, setError, logout } =
    useAuthStore();

  // Escuchar cambios de sesión de Supabase
  useEffect(() => {
    // Cargar usuario actual. `getUser()` es más confiable que `getSession()`
    // cuando la sesión fue creada en servidor y vive en cookies.
    supabase.auth.getUser().then(({ data, error: getUserError }) => {
      if (data.user) {
        // Mostramos fallback altiro para no dejar la UI en "Sin email" mientras
        // llega el perfil desde public.users.
        setUser(buildFallbackProfile(data.user));
        fetchProfile(data.user);
        return;
      }

      if (getUserError) {
        setError(getUserError.message);
      }

      setUser(null);
      setLoading(false);
    });

    // Suscribirse a cambios de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") &&
        session?.user
      ) {
        setUser(buildFallbackProfile(session.user));
        await fetchProfile(session.user);
      } else if (event === "SIGNED_OUT") {
        logout();
        setLoading(false);
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Construye un perfil mínimo a partir de la sesión de Supabase Auth.
   * Se usa cuando aún no existe la fila en `public.users` (p. ej. si el trigger
   * de creación de perfil no se ha ejecutado), para no mostrar "Sin email".
   */
  const buildFallbackProfile = (authUser: SupabaseAuthUser): User => {
    const metadata = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    const email = authUser.email ?? "";

    return {
      id: authUser.id,
      email,
      full_name:
        (metadata.full_name as string) ||
        (metadata.name as string) ||
        (email ? email.split("@")[0] : "Usuario"),
      avatar_url: (metadata.avatar_url as string) ?? null,
      currency: "CLP",
      timezone: "America/Santiago",
      dark_mode: true,
      created_at: authUser.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  const fetchProfile = async (authUser: SupabaseAuthUser) => {
    setLoading(true);
    try {
      // maybeSingle() no lanza error cuando no hay fila (perfil aún no creado).
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        setError(error.message);
        setUser(buildFallbackProfile(authUser));
        return;
      }

      if (data) {
        const profile = data as User;
        // Si el perfil existe pero le falta el email, lo completamos con el de auth.
        setUser(profile.email ? profile : { ...profile, email: authUser.email ?? "" });
      } else {
        setUser(buildFallbackProfile(authUser));
      }
    } catch (err) {
      console.error("Unexpected fetchProfile error:", err);
      setError(err instanceof Error ? err.message : "Error al cargar perfil");
      setUser(buildFallbackProfile(authUser));
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al iniciar sesión");
      setLoading(false);
      return false;
    }
    return true;
  };

  const register = async (
    email: string,
    password: string,
    full_name: string
  ) => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al registrarse");
      setLoading(false);
      return false;
    }
    return true;
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);

    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setError(error.message || "No se pudo iniciar con Google");
      setLoading(false);
      return false;
    }

    return true;
  };

  const signOut = async () => {
    // Limpiar sesion del servidor (cookies)
    await fetch("/api/auth/logout", { method: "POST" });
    // Limpiar sesion del cliente (Supabase JS) para que onAuthStateChange
    // dispare SIGNED_OUT y el estado quede limpio antes de navegar.
    await supabase.auth.signOut();
    logout();
    router.push("/login");
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  return {
    user,
    isLoading,
    error,
    login,
    register,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    setError,
  };
}


