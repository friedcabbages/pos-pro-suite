import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Crown,
  Calendar,
  Clock,
  Download,
  FileText,
  CheckCircle2,
  CreditCard,
  Zap,
  Building2,
  Users,
  Package,
  BarChart3,
} from 'lucide-react';
import { useSubscriptionStatus, useInvoices, useRequestUpgrade, type SubscriptionPlan } from '@/hooks/useSubscription';
import { format, differenceInDays } from 'date-fns';

const planFeatureIcons: Record<string, React.ReactNode> = {
  users: <Users className="h-4 w-4" />,
  products: <Package className="h-4 w-4" />,
  branches: <Building2 className="h-4 w-4" />,
  reports: <BarChart3 className="h-4 w-4" />,
};

export default function Subscription() {
  const { business, subscription, currentPlan, plans, businessStatus, isTrialExpired, trialDaysRemaining } = useSubscriptionStatus();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const requestUpgrade = useRequestUpgrade();
  
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  
  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const getStatusBadge = () => {
    switch (businessStatus) {
      case 'trial':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Trial</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Active</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return null;
    }
  };
  
  const handleUpgrade = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setUpgradeDialogOpen(true);
  };
  
  const handleConfirmUpgrade = () => {
    if (!selectedPlan) return;
    requestUpgrade.mutate(
      { planId: selectedPlan.id, billingCycle },
      { onSuccess: () => setUpgradeDialogOpen(false) }
    );
  };
  
  const generateInvoicePDF = (invoice: any) => {
    // Create a simple PDF-ready HTML content
    const content = `
      <html>
        <head><title>Invoice ${invoice.invoice_number}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
          .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .row { display: flex; justify-content: space-between; margin: 10px 0; }
          .total { font-size: 1.5em; font-weight: bold; margin-top: 20px; padding-top: 20px; border-top: 2px solid #333; }
          .status { padding: 5px 10px; background: ${invoice.status === 'paid' ? '#22c55e' : '#f59e0b'}; color: white; border-radius: 4px; }
        </style>
        </head>
        <body>
          <div class="header">
            <h1>INVOICE</h1>
            <p>${invoice.invoice_number}</p>
          </div>
          <div class="row"><span>Business:</span><span>${business?.name || 'N/A'}</span></div>
          <div class="row"><span>Plan:</span><span>${invoice.plan_name}</span></div>
          <div class="row"><span>Period:</span><span>${format(new Date(invoice.billing_period_start), 'MMM d, yyyy')} - ${format(new Date(invoice.billing_period_end), 'MMM d, yyyy')}</span></div>
          <div class="row"><span>Status:</span><span class="status">${invoice.status.toUpperCase()}</span></div>
          <div class="row total"><span>Amount:</span><span>${formatCurrency(invoice.amount, invoice.currency)}</span></div>
          ${invoice.paid_at ? `<p>Paid on: ${format(new Date(invoice.paid_at), 'MMM d, yyyy')}</p>` : ''}
          ${invoice.notes ? `<p>Notes: ${invoice.notes}</p>` : ''}
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Subscription & Billing</h1>
          <p className="text-sm text-muted-foreground">
            Manage your plan, view invoices, and track your subscription status.
          </p>
        </div>
        
        {/* Current Plan Summary */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <Crown className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{currentPlan?.display_name || 'Free Plan'}</h2>
                    {getStatusBadge()}
                  </div>
                  <p className="text-muted-foreground mt-1">
                    {businessStatus === 'trial' && trialDaysRemaining !== null && (
                      <>
                        <Clock className="h-4 w-4 inline mr-1" />
                        {trialDaysRemaining > 0 
                          ? `${trialDaysRemaining} days remaining in trial` 
                          : 'Trial expired'}
                      </>
                    )}
                    {businessStatus === 'active' && subscription && (
                      <>
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Renews on {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                      </>
                    )}
                    {businessStatus === 'expired' && 'Your subscription has expired'}
                    {businessStatus === 'suspended' && 'Your account is suspended'}
                  </p>
                </div>
              </div>
              {(businessStatus === 'trial' || businessStatus === 'expired') && (
                <Button variant="glow" onClick={() => setUpgradeDialogOpen(true)}>
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>
          
          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {plans?.map((plan) => {
                const isCurrentPlan = currentPlan?.id === plan.id;
                const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
                const monthlyEquivalent = billingCycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative ${isCurrentPlan ? 'border-primary ring-1 ring-primary' : ''}`}
                  >
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary">Current Plan</Badge>
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle>{plan.display_name}</CardTitle>
                      <CardDescription>
                        <span className="text-2xl font-bold text-foreground">
                          {formatCurrency(monthlyEquivalent)}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                        {billingCycle === 'yearly' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Billed {formatCurrency(price)} yearly
                          </p>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          {plan.max_users ? `Up to ${plan.max_users} users` : 'Unlimited users'}
                        </li>
                        <li className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          {plan.max_products ? `Up to ${plan.max_products} products` : 'Unlimited products'}
                        </li>
                        <li className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          {plan.max_branches ? `Up to ${plan.max_branches} branches` : 'Unlimited branches'}
                        </li>
                        {(plan.features as string[])?.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={isCurrentPlan ? 'outline' : 'default'}
                        className="w-full"
                        disabled={isCurrentPlan}
                        onClick={() => handleUpgrade(plan)}
                      >
                        {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Billing Cycle Toggle */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-4">
                  <span className={billingCycle === 'monthly' ? 'font-medium' : 'text-muted-foreground'}>
                    Monthly
                  </span>
                  <button
                    onClick={() => setBillingCycle(c => c === 'monthly' ? 'yearly' : 'monthly')}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${billingCycle === 'yearly' ? 'bg-primary' : 'bg-muted'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                  <span className={billingCycle === 'yearly' ? 'font-medium' : 'text-muted-foreground'}>
                    Yearly
                    <Badge variant="outline" className="ml-2 bg-success/10 text-success border-success/30">
                      Save 20%
                    </Badge>
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoice History
                </CardTitle>
                <CardDescription>View and download your past invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : !invoices?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No invoices yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div 
                        key={invoice.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{invoice.invoice_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {invoice.plan_name} • {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(invoice.amount, invoice.currency)}</p>
                            <Badge 
                              variant={invoice.status === 'paid' ? 'outline' : 'secondary'}
                              className={invoice.status === 'paid' ? 'bg-success/10 text-success' : ''}
                            >
                              {invoice.status}
                            </Badge>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => generateInvoicePDF(invoice)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Upgrade Dialog */}
        <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upgrade Your Plan</DialogTitle>
              <DialogDescription>
                Select a plan and billing cycle. You'll receive an invoice to complete the upgrade.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Plan</Label>
                <RadioGroup 
                  value={selectedPlan?.id} 
                  onValueChange={(v) => setSelectedPlan(plans?.find(p => p.id === v) || null)}
                >
                  {plans?.filter(p => p.id !== currentPlan?.id).map((plan) => (
                    <div key={plan.id} className="flex items-center space-x-2 p-3 rounded-lg border">
                      <RadioGroupItem value={plan.id} id={plan.id} />
                      <Label htmlFor={plan.id} className="flex-1 cursor-pointer">
                        <span className="font-medium">{plan.display_name}</span>
                        <span className="text-muted-foreground ml-2">
                          {formatCurrency(billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly)}
                          /{billingCycle === 'yearly' ? 'year' : 'month'}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <RadioGroup value={billingCycle} onValueChange={(v) => setBillingCycle(v as 'monthly' | 'yearly')}>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly" className="cursor-pointer">Monthly</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border">
                    <RadioGroupItem value="yearly" id="yearly" />
                    <Label htmlFor="yearly" className="cursor-pointer flex items-center gap-2">
                      Yearly
                      <Badge variant="outline" className="bg-success/10 text-success">Save 20%</Badge>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmUpgrade}
                disabled={!selectedPlan || requestUpgrade.isPending}
              >
                {requestUpgrade.isPending ? 'Processing...' : 'Request Upgrade'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
