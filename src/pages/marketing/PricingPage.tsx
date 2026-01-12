import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, Phone } from 'lucide-react';

export default function PricingPage() {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Starter',
      description: 'For small retail stores',
      price: 'Rp 299.000',
      period: '/month',
      features: [
        '1 Branch',
        '2 Users',
        '1 Warehouse',
        'POS System',
        'Basic Inventory',
        'Sales Reports',
        'Email Support',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
    {
      name: 'Professional',
      description: 'For growing businesses',
      price: 'Rp 599.000',
      period: '/month',
      features: [
        '3 Branches',
        '10 Users',
        '5 Warehouses',
        'Everything in Starter',
        'Advanced Inventory',
        'Stock Transfers',
        'Multi-payment Methods',
        'Priority Support',
      ],
      cta: 'Contact Sales',
      popular: true,
    },
    {
      name: 'Enterprise',
      description: 'For large operations',
      price: 'Custom',
      period: '',
      features: [
        'Unlimited Branches',
        'Unlimited Users',
        'Unlimited Warehouses',
        'Everything in Professional',
        'Custom Integrations',
        'API Access',
        'Dedicated Support',
        'SLA Guarantee',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  const faqs = [
    {
      question: 'How do I get started?',
      answer: 'Contact our sales team to schedule a demo. We\'ll help you choose the right plan and set up your business.',
    },
    {
      question: 'Can I change plans later?',
      answer: 'Absolutely. You can upgrade or downgrade your plan at any time by contacting your account manager.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept bank transfer, credit cards, and various e-wallets.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes. We use enterprise-grade security with row-level data isolation and encryption.',
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your business. All plans include core POS features.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 text-left mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => navigate('/marketing/contact')}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="bg-card p-6 rounded-xl border border-border">
                <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
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
            Our team is here to help. Contact us for a personalized demo and pricing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/marketing/contact')}>
              Request Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/marketing/contact')}>
              <Phone className="mr-2 h-4 w-4" />
              Contact Sales
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}