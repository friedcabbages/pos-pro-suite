import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Shield, Globe, ArrowRight } from 'lucide-react';

export default function TestingHub() {
  const navigate = useNavigate();

  const apps = [
    {
      title: 'Client POS Application',
      description: 'Full-featured point of sale system with inventory, transactions, and reporting',
      icon: ShoppingCart,
      path: '/app',
      color: 'bg-primary',
    },
    {
      title: 'Super Admin Panel',
      description: 'Internal SaaS management - business control, subscriptions, impersonation',
      icon: Shield,
      path: '/admin',
      color: 'bg-destructive',
    },
    {
      title: 'Marketing Website',
      description: 'Public-facing landing page with features, pricing, and signup CTA',
      icon: Globe,
      path: '/marketing',
      color: 'bg-success',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">VeloPOS Development Hub</h1>
          <p className="text-muted-foreground text-lg">
            Central testing entry point for all applications
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 text-warning text-sm font-medium">
            🔧 Build & Testing Phase
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {apps.map((app) => (
            <Card 
              key={app.path}
              className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
              onClick={() => navigate(app.path)}
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${app.color} flex items-center justify-center mb-4`}>
                  <app.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {app.title}
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardTitle>
                <CardDescription>{app.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Open Application
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Architecture: Multi-tenant SaaS • Supabase Backend • RLS Enabled</p>
        </div>
      </div>
    </div>
  );
}
