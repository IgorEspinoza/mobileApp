"use client";

import { useCallback } from "react";
import toast from "react-hot-toast";

export function useToast() {
  const success = useCallback((message: string) => {
    toast.success(message, {
      duration: 3000,
      position: "top-right",
      style: {
        background: "#059669",
        color: "#fff",
        borderRadius: "0.5rem",
      },
    });
  }, []);

  const error = useCallback((message: string) => {
    toast.error(message, {
      duration: 4000,
      position: "top-right",
      style: {
        background: "#dc2626",
        color: "#fff",
        borderRadius: "0.5rem",
      },
    });
  }, []);

  const loading = useCallback((message: string) => {
    return toast.loading(message, {
      position: "top-right",
      style: {
        background: "#1e40af",
        color: "#fff",
        borderRadius: "0.5rem",
      },
    });
  }, []);

  return { success, error, loading, dismiss: toast.dismiss };
}

