import { Bell, Search, HelpCircle, Crown, Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useNavigate } from "react-router-dom";
import { useConnectivityStatus } from "@/hooks/useConnectivityStatus";

export function Header() {
  const plan = usePlanAccess();
  const navigate = useNavigate();
  const connectivity = useConnectivityStatus();

  const planSuffix =
    plan.businessStatus === "trial" && typeof plan.trialDaysRemaining === "number"
      ? ` (${plan.trialDaysRemaining} days left)`
      : "";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-6">
      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="h-9 w-full bg-muted/50 pl-9 text-sm border-0 focus-visible:ring-1"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Badge
          variant="outline"
          className="mr-2 hidden sm:inline-flex items-center gap-2 text-xs text-muted-foreground"
        >
          {connectivity.status === "syncing" ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : connectivity.status === "offline" || connectivity.status === "offline_forced" ? (
            <WifiOff className="h-3.5 w-3.5" />
          ) : connectivity.status === "sync_failed" ? (
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          ) : (
            <Wifi className="h-3.5 w-3.5" />
          )}

          {connectivity.status === "syncing"
            ? "Syncing…"
            : connectivity.status === "offline_forced"
              ? "Offline Mode – Using local data"
              : connectivity.status === "offline"
                ? "Offline – Working locally"
                : connectivity.status === "sync_failed"
                  ? "Sync failed"
                  : "Online – All data synced"}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/subscription")}
          className="mr-2 hidden sm:inline-flex"
        >
          <Crown className="mr-2 h-4 w-4" />
          Plan: {plan.displayName}
          {planSuffix}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>
      </div>
    </header>
  );
}
