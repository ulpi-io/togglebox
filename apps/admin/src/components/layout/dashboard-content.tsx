"use client";

import { ReactNode } from "react";
import { ErrorBoundary } from "@/components/common/error-boundary";

interface DashboardContentProps {
  children: ReactNode;
}

/**
 * Dashboard content wrapper with error boundary.
 * Used to wrap page content in the dashboard layout.
 */
export function DashboardContent({ children }: DashboardContentProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
