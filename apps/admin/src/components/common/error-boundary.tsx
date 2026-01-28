"use client";

import React, { Component, ReactNode } from "react";
import { Button, Card, CardContent } from "@togglebox/ui";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for graceful error handling in dashboard pages.
 *
 * Catches JavaScript errors in child component tree, logs them,
 * and displays a fallback UI instead of crashing the whole page.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <DashboardPage />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console in development
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // In production, you could send this to an error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Card className="m-4">
          <CardContent className="py-12 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              An unexpected error occurred. Please try again or reload the page.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="text-left text-sm bg-muted p-4 rounded-md mb-4 max-w-lg mx-auto overflow-auto">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex justify-center gap-2">
              <Button onClick={this.handleRetry} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={this.handleReload}>Reload Page</Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
