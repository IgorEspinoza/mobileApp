"use client";

import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

interface LayoutErrorBoundaryProps {
  children: ReactNode;
}

export function LayoutErrorBoundary({ children }: LayoutErrorBoundaryProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

