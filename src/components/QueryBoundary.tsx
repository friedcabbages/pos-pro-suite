import { useState, useEffect } from "react";
import { WifiOff, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface QueryBoundaryProps {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  refetch?: () => void;
  loadingFallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Wraps query-dependent content and shows:
 * - Offline message when isError && !navigator.onLine
 * - Generic error when isError && online (with optional retry)
 * - Loading fallback when isLoading
 * - Children otherwise
 */
export function QueryBoundary({
  isLoading,
  isError,
  error,
  refetch,
  loadingFallback,
  children,
}: QueryBoundaryProps) {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (isLoading) {
    return (
      loadingFallback ?? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p>Loading...</p>
        </div>
      )
    );
  }

  if (isError && isOffline) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <WifiOff className="h-12 w-12 text-muted-foreground opacity-50" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              Anda offline
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Sambungkan internet untuk melihat data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive opacity-50" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              Gagal memuat data
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              {error?.message ?? "Terjadi kesalahan. Silakan coba lagi."}
            </p>
          </div>
          {refetch && (
            <Button variant="outline" onClick={() => refetch()}>
              Coba Lagi
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
