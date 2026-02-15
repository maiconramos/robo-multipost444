"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/use-i18n";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryCopy {
  title: string;
  message: string;
  details: string;
  retry: string;
}

interface InternalProps extends Props {
  copy: ErrorBoundaryCopy;
}

class InternalErrorBoundary extends Component<InternalProps, State> {
  constructor(props: InternalProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { copy } = this.props;

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {copy.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{copy.message}</p>
              {this.state.error && (
                <details className="rounded-lg bg-muted p-3 text-xs">
                  <summary className="cursor-pointer font-medium">{copy.details}</summary>
                  <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <Button onClick={this.handleRetry} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                {copy.retry}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children, fallback }: Props) {
  const { t } = useI18n();

  return (
    <InternalErrorBoundary
      fallback={fallback}
      copy={{
        title: t("Something went wrong"),
        message: t("An error occurred while loading this section. Please try again."),
        details: t("Error details"),
        retry: t("Try Again"),
      }}
    >
      {children}
    </InternalErrorBoundary>
  );
}

interface QueryErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
  message?: string;
}

export function QueryErrorState({ error, onRetry, message }: QueryErrorStateProps) {
  const { t } = useI18n();
  const normalizedMessage = message ? t(message) : t("Failed to load data");

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive/50" />
      <p className="mt-4 font-medium text-destructive">{normalizedMessage}</p>
      {error && (
        <p className="mt-1 text-sm text-muted-foreground">
          {error.message ? t(error.message) : t("An unexpected error occurred")}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("Retry")}
        </Button>
      )}
    </div>
  );
}
