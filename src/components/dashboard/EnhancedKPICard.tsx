import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EnhancedKPICardProps {
  title: string;
  value: string;
  comparison?: {
    value: number;
    label: string;
    type: 'percentage' | 'absolute';
  };
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
  tooltip?: string;
  onClick?: () => void;
}

const iconColors = {
  default: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

const bgColors = {
  default: "bg-primary/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  danger: "bg-destructive/10",
};

export function EnhancedKPICard({
  title,
  value,
  comparison,
  subtitle,
  icon: Icon,
  variant = "default",
  tooltip,
  onClick,
}: EnhancedKPICardProps) {
  const isPositive = comparison && comparison.value > 0;
  const isNegative = comparison && comparison.value < 0;
  const isNeutral = comparison && comparison.value === 0;

  const getTrendIcon = () => {
    if (isPositive) return <TrendingUp className="h-3.5 w-3.5" />;
    if (isNegative) return <TrendingDown className="h-3.5 w-3.5" />;
    return <Minus className="h-3.5 w-3.5" />;
  };

  const getTrendColor = () => {
    if (isPositive) return "text-success";
    if (isNegative) return "text-destructive";
    return "text-muted-foreground";
  };

  const formatComparison = () => {
    if (!comparison) return null;
    const absValue = Math.abs(comparison.value);
    if (comparison.type === 'percentage') {
      return `${absValue.toFixed(1)}%`;
    }
    return absValue.toString();
  };

  return (
    <div 
      className={cn(
        "rounded-lg border border-border bg-card p-5 transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/30 hover:shadow-sm"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground">{title}</p>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <h3 className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </h3>
        </div>
        <div className={cn("p-2.5 rounded-lg", bgColors[variant], iconColors[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {comparison && (
          <div className={cn("flex items-center gap-1.5 text-sm", getTrendColor())}>
            {getTrendIcon()}
            <span className="font-medium">{formatComparison()}</span>
            <span className="text-muted-foreground">{comparison.label}</span>
          </div>
        )}
        
        {subtitle && !comparison && (
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
