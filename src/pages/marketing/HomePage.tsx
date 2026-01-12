import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  BarChart3, 
  Package, 
  Users, 
  Shield, 
  Zap,
  CheckCircle2,
  ArrowRight,
  Phone
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: ShoppingCart,
      title: 'Fast Checkout',
      description: 'Process transactions quickly with our intuitive POS interface',
    },
    {
      icon: Package,
      title: 'Inventory Control',
      description: 'Track stock levels across multiple warehouses in real-time',
    },
    {
      icon: BarChart3,
      title: 'Smart Reports',
      description: 'Get insights with comprehensive sales and profit analytics',
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Manage staff roles and permissions with ease',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with data encryption',
    },
    {
      icon: Zap,
      title: 'Cloud-Based',
      description: 'Access your business data from anywhere, anytime',
    },
  ];

  const benefits = [
    'Multi-branch support',
    'Real-time inventory sync',
    'Multiple payment methods',
    'Role-based access control',
    'Detailed audit logs',
    'Export reports to CSV',
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
              Modern POS for
              <span className="text-primary"> Growing Retail</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              VeloPOS is a complete point of sale solution designed for retail businesses. 
              Manage sales, inventory, and teams from one powerful platform.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate('/marketing/contact')}>
                Request Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/marketing/features')}>
                View Features
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Enterprise-ready • Secure multi-tenant architecture
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Everything you need to run your store
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help retail businesses operate efficiently
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                Built for serious retail businesses
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Whether you run a single store or multiple branches, VeloPOS scales with your business. 
                Our multi-tenant architecture ensures your data is always isolated and secure.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button onClick={() => navigate('/marketing/contact')}>
                  Contact Sales
                  <Phone className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-muted/50 rounded-2xl p-8 border border-border">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-24 w-24 text-primary/50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
            Ready to modernize your retail business?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join businesses already using VeloPOS to streamline their operations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => navigate('/marketing/contact')}
            >
              Request Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate('/marketing/pricing')}
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}