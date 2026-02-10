import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  User,
} from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useConnectivityMode } from "@/hooks/useConnectivityMode";
import type { ConnectivityMode } from "@/data/connectivityMode";

export default function Settings() {
  const { business, refetchBusiness } = useBusiness();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const { mode: connectivityMode, setMode: setConnectivityMode } = useConnectivityMode();
  
  const [businessData, setBusinessData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    currency: "USD",
  });

  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: "",
    username: "",
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

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    
    setProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone, username")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfileData({
        full_name: data.full_name || "",
        phone: data.phone || "",
        username: data.username || "",
      });
    }
    setProfileLoading(false);
  };

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

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    
    // Validate username if provided
    const usernameTrimmed = profileData.username.trim();
    if (usernameTrimmed) {
      const usernamePattern = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernamePattern.test(usernameTrimmed)) {
        toast({ 
          title: "Invalid username", 
          description: "Username must be 3-30 characters and only contain letters, numbers, or underscores",
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      // Check uniqueness (excluding current user)
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", usernameTrimmed.toLowerCase())
        .neq("id", user.id)
        .maybeSingle();

      if (existing) {
        toast({ 
          title: "Username taken", 
          description: "This username is already in use",
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profileData.full_name || null,
        phone: profileData.phone || null,
        username: usernameTrimmed ? usernameTrimmed.toLowerCase() : null,
      })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved" });
      fetchProfile();
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
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
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
            <div className="space-y-6">
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

              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h3 className="text-lg font-semibold text-foreground">
                  Connectivity Mode
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose whether the app should sync with the cloud or stay local only.
                </p>
                <RadioGroup
                  value={connectivityMode}
                  onValueChange={(value) => setConnectivityMode(value as ConnectivityMode)}
                  className="mt-4 grid gap-3"
                >
                  <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                    <RadioGroupItem value="online" />
                    <div>
                      <p className="font-medium text-foreground">Online (Auto Sync)</p>
                      <p className="text-sm text-muted-foreground">
                        Sync to Supabase when network is available.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                    <RadioGroupItem value="offline" />
                    <div>
                      <p className="font-medium text-foreground">Offline (Local Only)</p>
                      <p className="text-sm text-muted-foreground">
                        Keep all reads and writes in local IndexedDB.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </div>
          </TabsContent>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-6 text-lg font-semibold text-foreground">
                Your Profile
              </h3>
              {profileLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="+62 8xxx xxxx xxxx"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="username">Username (optional)</Label>
                    <Input
                      id="username"
                      type="text"
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                      placeholder="username (3-30 chars, letters, numbers, underscore)"
                      pattern="[a-zA-Z0-9_]{3,30}"
                    />
                    <p className="text-xs text-muted-foreground">
                      If set, you can login using this username instead of email.
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <Button variant="glow" onClick={handleSaveProfile} disabled={loading}>
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
