import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { Loader2, Store, Building2, ArrowRight } from "lucide-react";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [branchName, setBranchName] = useState("Main Branch");
  const [branchAddress, setBranchAddress] = useState("");
  const [warehouseName, setWarehouseName] = useState("Main Warehouse");
  const { user, initialized: authInitialized, loading: authLoading } = useAuth();
  const { business, loading: businessLoading, refetchBusiness } = useBusiness();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect to dashboard if already has business
  if (authInitialized && !authLoading && !businessLoading && business) {
    console.log('[Onboarding] Already has business, redirecting to /');
    return <Navigate to="/" replace />;
  }

  // Redirect to auth if not logged in
  if (authInitialized && !authLoading && !user) {
    console.log('[Onboarding] No user, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  // Show loading while checking auth/business state
  if (!authInitialized || authLoading || businessLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleCreateBusiness = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 1. Create business with owner_id
      const { data: business, error: bizError } = await supabase
        .from("businesses")
        .insert({ 
          name: businessName, 
          currency,
          owner_id: user.id 
        })
        .select()
        .single();

      if (bizError) throw bizError;

      // 2. Create branch
      const { data: branch, error: branchError } = await supabase
        .from("branches")
        .insert({
          business_id: business.id,
          name: branchName,
          address: branchAddress,
        })
        .select()
        .single();

      if (branchError) throw branchError;

      // 3. Create warehouse
      const { error: warehouseError } = await supabase
        .from("warehouses")
        .insert({
          branch_id: branch.id,
          name: warehouseName,
        });

      if (warehouseError) throw warehouseError;

      // 4. Create user role (owner)
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          business_id: business.id,
          role: "owner",
        });

      if (roleError) throw roleError;

      // 5. Update profile with business_id and branch_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          business_id: business.id,
          branch_id: branch.id,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 6. Create default settings
      const { error: settingsError } = await supabase
        .from("settings")
        .insert({ business_id: business.id });

      if (settingsError) throw settingsError;

      toast({
        title: "Business Created",
        description: "Your business has been set up successfully!",
      });

      // Refetch business data before navigating
      await refetchBusiness();
      navigate("/", { replace: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Progress */}
        <div className="flex justify-center gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Business Info */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
                <Store className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-foreground">
                Set Up Your Business
              </h1>
              <p className="mt-2 text-muted-foreground">
                Let's get your business up and running
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="My Awesome Store"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="glow"
              className="w-full"
              onClick={() => setStep(2)}
              disabled={!businessName.trim()}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Branch & Warehouse */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
                <Building2 className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-foreground">
                Set Up Your Location
              </h1>
              <p className="mt-2 text-muted-foreground">
                Configure your first branch and warehouse
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
              <div className="space-y-2">
                <Label htmlFor="branchName">Branch Name</Label>
                <Input
                  id="branchName"
                  placeholder="Main Branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchAddress">Branch Address</Label>
                <Input
                  id="branchAddress"
                  placeholder="123 Main Street, City"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouseName">Warehouse Name</Label>
                <Input
                  id="warehouseName"
                  placeholder="Main Warehouse"
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="glow"
                className="flex-1"
                onClick={handleCreateBusiness}
                disabled={loading || !branchName.trim() || !warehouseName.trim()}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
