import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
  delay?: number;
}

const iconColors = {
  default: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

export function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  variant = "default",
}: KPICardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </h3>
        </div>
        <div className={cn("p-2 rounded-md bg-muted", iconColors[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {change !== undefined && (
        <div className="mt-3 flex items-center gap-1.5 text-sm">
          <span
            className={cn(
              "flex items-center gap-0.5 font-medium",
              isPositive && "text-success",
              isNegative && "text-destructive",
              !isPositive && !isNegative && "text-muted-foreground"
            )}
          >
            {isPositive && <TrendingUp className="h-3.5 w-3.5" />}
            {isNegative && <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(change)}%
          </span>
          {changeLabel && (
            <span className="text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
