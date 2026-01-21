import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button onClick={action.onClick}>
              {action.icon && <action.icon className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          )}
        </div>
      )}
      
      {children}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function ProductsEmptyState({ onAddProduct }: { onAddProduct: () => void }) {
  return (
    <EmptyState
      icon={require('lucide-react').Package}
      title="No products yet"
      description="Add your first product to start selling. It only takes a minute."
      action={{
        label: 'Add Product',
        onClick: onAddProduct,
        icon: require('lucide-react').Plus,
      }}
    />
  );
}

export function SalesEmptyState({ onOpenPOS }: { onOpenPOS: () => void }) {
  return (
    <EmptyState
      icon={require('lucide-react').ShoppingCart}
      title="No sales yet"
      description="Start your first transaction and watch your business grow."
      action={{
        label: 'Open POS',
        onClick: onOpenPOS,
        icon: require('lucide-react').ArrowRight,
      }}
    />
  );
}

export function InventoryEmptyState({ onAddStock }: { onAddStock: () => void }) {
  return (
    <EmptyState
      icon={require('lucide-react').Layers}
      title="No inventory tracked"
      description="Track your stock levels here. Add products first, then set their inventory."
      action={{
        label: 'Add Stock',
        onClick: onAddStock,
        icon: require('lucide-react').Plus,
      }}
    />
  );
}

export function TransactionsEmptyState({ onOpenPOS }: { onOpenPOS: () => void }) {
  return (
    <EmptyState
      icon={require('lucide-react').Receipt}
      title="No transactions yet"
      description="Complete your first sale to see transaction history here."
      action={{
        label: 'Open POS',
        onClick: onOpenPOS,
      }}
    />
  );
}
