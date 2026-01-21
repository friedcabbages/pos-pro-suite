import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Store, 
  Package, 
  Layers, 
  ShoppingCart, 
  X, 
  ChevronRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useOnboardingProgress, useCompleteOnboarding } from '@/hooks/useOnboarding';
import { useBusiness } from '@/contexts/BusinessContext';

interface OnboardingWizardProps {
  onClose: () => void;
}

const steps = [
  {
    id: 'store_info',
    title: 'Set Up Your Store',
    description: 'Add your store name, currency, and basic info',
    icon: Store,
    action: 'Go to Settings',
    path: '/settings',
  },
  {
    id: 'first_product',
    title: 'Add Your First Product',
    description: 'Create a product to start selling',
    icon: Package,
    action: 'Add Product',
    path: '/products',
  },
  {
    id: 'initial_stock',
    title: 'Set Initial Stock',
    description: 'Add inventory to your warehouse',
    icon: Layers,
    action: 'Manage Inventory',
    path: '/inventory',
  },
  {
    id: 'first_sale',
    title: 'Make Your First Sale',
    description: 'Open the POS and complete a transaction',
    icon: ShoppingCart,
    action: 'Open POS',
    path: '/pos',
  },
];

export function OnboardingWizard({ onClose }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const { business } = useBusiness();
  const { data: progress } = useOnboardingProgress();
  const completeOnboarding = useCompleteOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  
  const completedSteps = progress ? [
    progress.step_store_info,
    progress.step_first_product,
    progress.step_initial_stock,
    progress.step_first_sale,
  ] : [false, false, false, false];
  
  const completedCount = completedSteps.filter(Boolean).length;
  const progressPercent = (completedCount / steps.length) * 100;
  
  const handleSkip = () => {
    completeOnboarding.mutate({ skipped: true });
    onClose();
  };
  
  const handleStepAction = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-primary/20 animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="relative pb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Welcome to {business?.name || 'VeloPOS'}!</CardTitle>
              <CardDescription>Let's set up your store in just a few steps</CardDescription>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Setup Progress</span>
              <span className="font-medium">{completedCount} of {steps.length} completed</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = completedSteps[index];
              const isCurrent = index === currentStep;
              
              return (
                <div
                  key={step.id}
                  className={`
                    group flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer
                    ${isCompleted 
                      ? 'bg-success/5 border-success/30' 
                      : isCurrent 
                        ? 'bg-primary/5 border-primary/30 shadow-sm' 
                        : 'hover:bg-muted/50 border-border'
                    }
                  `}
                  onClick={() => !isCompleted && setCurrentStep(index)}
                >
                  <div className={`
                    h-10 w-10 rounded-lg flex items-center justify-center shrink-0
                    ${isCompleted 
                      ? 'bg-success text-success-foreground' 
                      : isCurrent 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {step.description}
                    </p>
                  </div>
                  {!isCompleted && (
                    <Button 
                      size="sm" 
                      variant={isCurrent ? 'default' : 'ghost'}
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStepAction(step.path);
                      }}
                    >
                      {step.action}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
            {completedCount === steps.length && (
              <Button 
                variant="glow"
                onClick={() => {
                  completeOnboarding.mutate({ skipped: false });
                  onClose();
                }}
              >
                Complete Setup
                <Sparkles className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
