import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  DollarSign,
  Package,
  Bell,
  Save,
  Loader2,
} from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Settings() {
  const { business, refetchBusiness } = useBusiness();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  
  const [businessData, setBusinessData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    currency: "USD",
  });

  const [settings, setSettings] = useState({
    enable_tax: false,
    default_tax_rate: 0,
    enable_multi_warehouse: true,
    enable_expiry_tracking: false,
    enable_expenses: true,
  });

  useEffect(() => {
    if (business) {
      setBusinessData({
        name: business.name || "",
        email: business.email || "",
        phone: business.phone || "",
        address: business.address || "",
        currency: business.currency || "USD",
      });
      fetchSettings();
    }
  }, [business]);

  const fetchSettings = async () => {
    if (!business?.id) return;
    
    setSettingsLoading(true);
    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("business_id", business.id)
      .single();

    if (data) {
      setSettings({
        enable_tax: data.enable_tax || false,
        default_tax_rate: data.default_tax_rate || 0,
        enable_multi_warehouse: data.enable_multi_warehouse ?? true,
        enable_expiry_tracking: data.enable_expiry_tracking || false,
        enable_expenses: data.enable_expenses ?? true,
      });
    }
    setSettingsLoading(false);
  };

  const handleSaveBusiness = async () => {
    if (!business?.id) return;
    
    setLoading(true);
    const { error } = await supabase
      .from("businesses")
      .update({
        name: businessData.name,
        email: businessData.email,
        phone: businessData.phone,
        address: businessData.address,
        currency: businessData.currency,
      })
      .eq("id", business.id);

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Business settings saved" });
      refetchBusiness();
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    if (!business?.id) return;
    
    setLoading(true);
    const { error } = await supabase
      .from("settings")
      .update({
        enable_tax: settings.enable_tax,
        default_tax_rate: settings.default_tax_rate,
        enable_multi_warehouse: settings.enable_multi_warehouse,
        enable_expiry_tracking: settings.enable_expiry_tracking,
        enable_expenses: settings.enable_expenses,
      })
      .eq("business_id", business.id);

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved" });
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-1 text-muted-foreground">
            Configure your business and system preferences
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="business" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="business" className="gap-2">
              <Building2 className="h-4 w-4" />
              Business
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="modules" className="gap-2">
              <Package className="h-4 w-4" />
              Modules
            </TabsTrigger>
          </TabsList>

          {/* Business Settings */}
          <TabsContent value="business">
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-6 text-lg font-semibold text-foreground">
                Business Profile
              </h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input 
                    id="businessName" 
                    value={businessData.name}
                    onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={businessData.currency} 
                    onValueChange={(v) => setBusinessData({ ...businessData, currency: v })}
                  >
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
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={businessData.email}
                    onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone" 
                    value={businessData.phone}
                    onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input 
                    id="address" 
                    value={businessData.address}
                    onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button variant="glow" onClick={handleSaveBusiness} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Financial Settings */}
          <TabsContent value="financial">
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-6 text-lg font-semibold text-foreground">
                Financial Settings
              </h3>
              {settingsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                    <Input 
                      id="taxRate" 
                      type="number" 
                      value={settings.default_tax_rate}
                      onChange={(e) => setSettings({ ...settings, default_tax_rate: Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-4 sm:col-span-2">
                    <div>
                      <p className="font-medium text-foreground">Enable Tax</p>
                      <p className="text-sm text-muted-foreground">
                        Apply tax to all transactions
                      </p>
                    </div>
                    <Switch 
                      checked={settings.enable_tax}
                      onCheckedChange={(v) => setSettings({ ...settings, enable_tax: v })}
                    />
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <Button variant="glow" onClick={handleSaveSettings} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Module Settings */}
          <TabsContent value="modules">
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-6 text-lg font-semibold text-foreground">
                Feature Modules
              </h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Enable or disable features based on your business needs
              </p>
              {settingsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">Multi-Warehouse</p>
                      <p className="text-sm text-muted-foreground">
                        Manage multiple warehouse locations
                      </p>
                    </div>
                    <Switch 
                      checked={settings.enable_multi_warehouse}
                      onCheckedChange={(v) => setSettings({ ...settings, enable_multi_warehouse: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">Expiry Tracking</p>
                      <p className="text-sm text-muted-foreground">
                        Track product expiration dates
                      </p>
                    </div>
                    <Switch 
                      checked={settings.enable_expiry_tracking}
                      onCheckedChange={(v) => setSettings({ ...settings, enable_expiry_tracking: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">Expense Module</p>
                      <p className="text-sm text-muted-foreground">
                        Track and manage business expenses
                      </p>
                    </div>
                    <Switch 
                      checked={settings.enable_expenses}
                      onCheckedChange={(v) => setSettings({ ...settings, enable_expenses: v })}
                    />
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <Button variant="glow" onClick={handleSaveSettings} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
