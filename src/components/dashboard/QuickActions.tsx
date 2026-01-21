import { 
  ShoppingCart, 
  Package, 
  PackagePlus, 
  BarChart3,
  ArrowRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const actions = [
  {
    id: 'new-sale',
    label: 'New Sale',
    description: 'Start a transaction',
    icon: ShoppingCart,
    path: '/pos',
    variant: 'default' as const,
  },
  {
    id: 'add-product',
    label: 'Add Product',
    description: 'Create new item',
    icon: Package,
    path: '/products',
    variant: 'outline' as const,
  },
  {
    id: 'add-stock',
    label: 'Add Stock',
    description: 'Update inventory',
    icon: PackagePlus,
    path: '/inventory',
    variant: 'outline' as const,
  },
  {
    id: 'view-reports',
    label: 'View Reports',
    description: 'See analytics',
    icon: BarChart3,
    path: '/reports',
    variant: 'outline' as const,
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
        <p className="text-sm text-muted-foreground">What would you like to do?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant}
            className="h-auto flex-col items-start gap-1 p-4 text-left group"
            onClick={() => navigate(action.path)}
          >
            <div className="flex w-full items-center justify-between">
              <action.icon className="h-5 w-5" />
              <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
            <div className="mt-2">
              <p className="font-medium">{action.label}</p>
              <p className="text-xs text-muted-foreground font-normal">
                {action.description}
              </p>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
