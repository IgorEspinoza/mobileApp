"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import type { User } from "@/types/database";

export function useAuth() {
  const router = useRouter();
  const { user, isLoading, error, setUser, setLoading, setError, logout } =
    useAuthStore();

  // Escuchar cambios de sesión de Supabase
  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Suscribirse a cambios de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await fetchProfile(session.user.id);
      } else if (event === "SIGNED_OUT") {
        logout();
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      setError(error.message);
    } else {
      setUser(data as User);
    }
    setLoading(false);
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
    await fetch("/api/auth/logout", { method: "POST" });
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


