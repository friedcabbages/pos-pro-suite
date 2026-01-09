import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  Package, 
  Warehouse, 
  BarChart3, 
  Users, 
  FileText,
  CreditCard,
  Bell,
  Lock,
  RefreshCw,
  Globe,
  Smartphone,
  ArrowRight
} from 'lucide-react';

export default function FeaturesPage() {
  const navigate = useNavigate();

  const featureCategories = [
    {
      title: 'Point of Sale',
      description: 'Fast, intuitive checkout experience',
      icon: ShoppingCart,
      features: [
        'Quick product search and barcode scanning',
        'Multiple payment methods (Cash, Card, QRIS)',
        'Customer management',
        'Discount and promotion support',
        'Digital receipt generation',
        'Offline mode capability',
      ],
    },
    {
      title: 'Inventory Management',
      description: 'Complete control over your stock',
      icon: Package,
      features: [
        'Real-time stock tracking',
        'Low stock alerts',
        'Stock adjustments and transfers',
        'Batch and expiry tracking',
        'Product categories and variants',
        'Barcode/SKU management',
      ],
    },
    {
      title: 'Multi-Warehouse',
      description: 'Manage multiple locations',
      icon: Warehouse,
      features: [
        'Multiple warehouse support',
        'Inter-warehouse transfers',
        'Location-based inventory',
        'Warehouse-specific reports',
        'Stock movement history',
        'Centralized dashboard',
      ],
    },
    {
      title: 'Reporting & Analytics',
      description: 'Data-driven business insights',
      icon: BarChart3,
      features: [
        'Sales and revenue reports',
        'Profit margin analysis',
        'Top products dashboard',
        'Daily/monthly summaries',
        'Export to CSV',
        'Custom date ranges',
      ],
    },
    {
      title: 'Team Management',
      description: 'Role-based access control',
      icon: Users,
      features: [
        'Owner, Admin, Cashier roles',
        'Branch-level permissions',
        'User activity tracking',
        'Secure user creation',
        'Profile management',
        'Access restrictions',
      ],
    },
    {
      title: 'Audit & Compliance',
      description: 'Complete activity tracking',
      icon: FileText,
      features: [
        'Comprehensive audit logs',
        'User action tracking',
        'Data change history',
        'Export audit reports',
        'IP address logging',
        'Timestamp records',
      ],
    },
  ];

  const additionalFeatures = [
    { icon: CreditCard, title: 'Multiple Payments', description: 'Cash, cards, QRIS, and more' },
    { icon: Bell, title: 'Stock Alerts', description: 'Never run out of popular items' },
    { icon: Lock, title: 'Secure by Default', description: 'Row-level security on all data' },
    { icon: RefreshCw, title: 'Real-time Sync', description: 'Data updates instantly' },
    { icon: Globe, title: 'Cloud-Based', description: 'Access from anywhere' },
    { icon: Smartphone, title: 'Mobile Ready', description: 'Works on all devices' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
            Powerful Features for Modern Retail
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to run a successful retail business, from point of sale to inventory management and beyond.
          </p>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-20">
            {featureCategories.map((category, index) => (
              <div 
                key={category.title}
                className={`grid lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <category.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">{category.title}</h2>
                  </div>
                  <p className="text-lg text-muted-foreground mb-6">{category.description}</p>
                  <ul className="space-y-3">
                    {category.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-success" />
                        </div>
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`bg-muted/50 rounded-2xl p-8 border border-border ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                    <category.icon className="h-20 w-20 text-primary/40" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            And much more...
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature) => (
              <div key={feature.title} className="bg-card p-6 rounded-xl border border-border">
                <feature.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Try VeloPOS free for 14 days. No credit card required.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Start Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  );
}
