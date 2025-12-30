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
  Receipt,
  Package,
  Warehouse,
  Bell,
  Save,
} from "lucide-react";

export default function Settings() {
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
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
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
                  <Input id="businessName" defaultValue="VeloPOS Store" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select defaultValue="retail">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cafe">Café & Restaurant</SelectItem>
                      <SelectItem value="retail">Retail Store</SelectItem>
                      <SelectItem value="agriculture">Agriculture</SelectItem>
                      <SelectItem value="warehouse">Warehouse & Distribution</SelectItem>
                      <SelectItem value="sme">SME / General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="contact@velpos.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" defaultValue="+62 812 3456 7890" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" defaultValue="Jl. Sudirman No. 123, Jakarta" />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button variant="glow">
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
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select defaultValue="usd">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD - US Dollar</SelectItem>
                      <SelectItem value="idr">IDR - Indonesian Rupiah</SelectItem>
                      <SelectItem value="eur">EUR - Euro</SelectItem>
                      <SelectItem value="gbp">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                  <Input id="taxRate" type="number" defaultValue="10" />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4 sm:col-span-2">
                  <div>
                    <p className="font-medium text-foreground">Enable Tax</p>
                    <p className="text-sm text-muted-foreground">
                      Apply tax to all transactions
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4 sm:col-span-2">
                  <div>
                    <p className="font-medium text-foreground">Auto-calculate Profit</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically calculate profit margin from cost and selling price
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button variant="glow">
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
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Warehouse className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Multi-Warehouse</p>
                      <p className="text-sm text-muted-foreground">
                        Manage multiple warehouse locations
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                      <Package className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Expiry Tracking</p>
                      <p className="text-sm text-muted-foreground">
                        Track product expiration dates
                      </p>
                    </div>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                      <Receipt className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Expense Module</p>
                      <p className="text-sm text-muted-foreground">
                        Track and manage business expenses
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                      <DollarSign className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Tax Module</p>
                      <p className="text-sm text-muted-foreground">
                        Apply taxes to transactions
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button variant="glow">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-6 text-lg font-semibold text-foreground">
                Notification Preferences
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium text-foreground">Low Stock Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when products are running low
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium text-foreground">Daily Sales Report</p>
                    <p className="text-sm text-muted-foreground">
                      Receive daily sales summary via email
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium text-foreground">New Transaction</p>
                    <p className="text-sm text-muted-foreground">
                      Sound notification for new transactions
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button variant="glow">
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
