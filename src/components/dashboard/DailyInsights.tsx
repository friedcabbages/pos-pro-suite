import { 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Sparkles
} from "lucide-react";
import { useDashboardStats, useLowStockProducts } from "@/hooks/useDashboard";

interface InsightItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  type: 'info' | 'success' | 'warning';
}

export function DailyInsights() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: lowStock, isLoading: stockLoading } = useLowStockProducts();

  const isLoading = statsLoading || stockLoading;

  const formatHour = (hour: number | null) => {
    if (hour === null) return "—";
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h}:00 ${ampm}`;
  };

  const insights: InsightItem[] = [
    {
      id: 'low-stock',
      icon: <AlertTriangle className="h-4 w-4 text-warning" />,
      label: 'Low stock items',
      value: lowStock?.length?.toString() || '0',
      type: (lowStock?.length || 0) > 0 ? 'warning' : 'success',
    },
    {
      id: 'best-seller',
      icon: <TrendingUp className="h-4 w-4 text-success" />,
      label: 'Best seller today',
      value: stats?.bestSellerToday || '—',
      type: stats?.bestSellerToday ? 'success' : 'info',
    },
    {
      id: 'busiest-hour',
      icon: <Clock className="h-4 w-4 text-primary" />,
      label: 'Busiest hour',
      value: formatHour(stats?.busiestHour ?? null),
      type: 'info',
    },
  ];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Daily Insights</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const hasAnyData = stats?.totalOrders || lowStock?.length;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Daily Insights</h3>
      </div>

      {!hasAnyData ? (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Insights will appear as you make sales
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div 
              key={insight.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
            >
              <div className="flex-shrink-0">
                {insight.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{insight.label}</p>
                <p className="text-sm font-medium text-foreground truncate">
                  {insight.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
