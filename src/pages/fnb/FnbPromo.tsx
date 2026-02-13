import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus, Loader2 } from "lucide-react";
import { QueryBoundary } from "@/components/QueryBoundary";
import {
  useFnbPromotions,
  useCreateFnbPromotion,
  useUpdateFnbPromotion,
  useFnbBundles,
  useCreateFnbBundle,
  useUpdateFnbBundle,
  useFnbMenuItems,
} from "@/hooks/useFnb";
import { format } from "date-fns";

export default function FnbPromo() {
  const [promoOpen, setPromoOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);

  const [promoName, setPromoName] = useState("");
  const [promoType, setPromoType] = useState<"percentage" | "fixed" | "bogo" | "bundle">("percentage");
  const [promoValue, setPromoValue] = useState("10");
  const [promoMinOrder, setPromoMinOrder] = useState("0");
  const [promoStart, setPromoStart] = useState("");
  const [promoEnd, setPromoEnd] = useState("");

  const [bundleName, setBundleName] = useState("");
  const [bundleDesc, setBundleDesc] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");
  const [bundleProductIds, setBundleProductIds] = useState<string[]>([]);
  const [bundleQuantities, setBundleQuantities] = useState<number[]>([]);
  const [selProductId, setSelProductId] = useState("");
  const [selQty, setSelQty] = useState("1");

  const { data: promotions = [], isLoading: promotionsLoading, isError: promotionsError, error: promotionsErrorObj, refetch: refetchPromotions } = useFnbPromotions();
  const { data: bundles = [], isLoading: bundlesLoading } = useFnbBundles();
  const { data: menuItems = [] } = useFnbMenuItems();

  const createPromo = useCreateFnbPromotion();
  const updatePromo = useUpdateFnbPromotion();
  const createBundle = useCreateFnbBundle();
  const updateBundle = useUpdateFnbBundle();

  const handleCreatePromo = async () => {
    if (!promoName || !promoStart || !promoEnd) return;
    await createPromo.mutateAsync({
      name: promoName,
      promoType,
      value: parseFloat(promoValue) || 0,
      minOrderAmount: parseFloat(promoMinOrder) || 0,
      startAt: new Date(promoStart).toISOString(),
      endAt: new Date(promoEnd).toISOString(),
    });
    setPromoOpen(false);
    setPromoName("");
    setPromoValue("10");
    setPromoMinOrder("0");
    setPromoStart("");
    setPromoEnd("");
  };

  const handleAddBundleProduct = () => {
    if (!selProductId) return;
    const qty = parseInt(selQty, 10) || 1;
    if (bundleProductIds.includes(selProductId)) {
      const idx = bundleProductIds.indexOf(selProductId);
      bundleQuantities[idx] += qty;
      setBundleQuantities([...bundleQuantities]);
    } else {
      setBundleProductIds([...bundleProductIds, selProductId]);
      setBundleQuantities([...bundleQuantities, qty]);
    }
    setSelProductId("");
    setSelQty("1");
  };

  const handleRemoveBundleProduct = (idx: number) => {
    setBundleProductIds(bundleProductIds.filter((_, i) => i !== idx));
    setBundleQuantities(bundleQuantities.filter((_, i) => i !== idx));
  };

  const handleCreateBundle = async () => {
    if (!bundleName || bundleProductIds.length === 0 || !bundlePrice) return;
    await createBundle.mutateAsync({
      name: bundleName,
      description: bundleDesc || undefined,
      bundlePrice: parseFloat(bundlePrice) || 0,
      productIds: bundleProductIds,
      quantities: bundleQuantities,
    });
    setBundleOpen(false);
    setBundleName("");
    setBundleDesc("");
    setBundlePrice("");
    setBundleProductIds([]);
    setBundleQuantities([]);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Promo & Bundles</h1>
          </div>
          <p className="text-muted-foreground">
            Manage promotions and product bundles
          </p>
        </div>

        <QueryBoundary isLoading={promotionsLoading || bundlesLoading} isError={!!promotionsError} error={promotionsErrorObj ?? undefined} refetch={refetchPromotions}>
        <Tabs defaultValue="promotions">
          <TabsList>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            <TabsTrigger value="bundles">Bundles</TabsTrigger>
          </TabsList>

          <TabsContent value="promotions" className="mt-4">
            <div className="mb-4 flex justify-end">
              <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Promotion
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Promotion</DialogTitle>
                    <DialogDescription>
                      Set discount type, value, and validity period.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={promoName} onChange={(e) => setPromoName(e.target.value)} placeholder="e.g. Happy Hour 20% off" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type</Label>
                        <Select value={promoType} onValueChange={(v) => setPromoType(v as typeof promoType)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed amount</SelectItem>
                            <SelectItem value="bogo">Buy One Get One</SelectItem>
                            <SelectItem value="bundle">Bundle</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Value</Label>
                        <Input type="number" min="0" value={promoValue} onChange={(e) => setPromoValue(e.target.value)} placeholder="10 or 5000" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {promoType === "percentage" ? "e.g. 10 = 10% off" : "e.g. 5000 = Rp 5.000 off"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label>Min order amount</Label>
                      <Input type="number" min="0" value={promoMinOrder} onChange={(e) => setPromoMinOrder(e.target.value)} placeholder="0" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start</Label>
                        <Input type="datetime-local" value={promoStart} onChange={(e) => setPromoStart(e.target.value)} />
                      </div>
                      <div>
                        <Label>End</Label>
                        <Input type="datetime-local" value={promoEnd} onChange={(e) => setPromoEnd(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPromoOpen(false)}>Cancel</Button>
                    <Button onClick={() => void handleCreatePromo()} disabled={!promoName || !promoStart || !promoEnd || createPromo.isPending}>
                      {createPromo.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Active Promotions</CardTitle>
                <CardDescription>Promotions are applied at checkout (when payment is integrated)</CardDescription>
              </CardHeader>
              <CardContent>
                {promotionsLoading ? (
                  <div className="flex items-center gap-2 py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : promotions.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No promotions yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promotions.map((p) => (
                        <TableRow key={(p as { id: string }).id}>
                          <TableCell className="font-medium">{(p as { name: string }).name}</TableCell>
                          <TableCell>{(p as { promo_type: string }).promo_type}</TableCell>
                          <TableCell>{(p as { value: number }).value}</TableCell>
                          <TableCell>
                            {format(new Date((p as { start_at: string }).start_at), "dd MMM")} - {format(new Date((p as { end_at: string }).end_at), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={(p as { is_active: boolean }).is_active ? "default" : "secondary"}>
                              {(p as { is_active: boolean }).is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updatePromo.mutate({
                                  id: (p as { id: string }).id,
                                  isActive: !(p as { is_active: boolean }).is_active,
                                })
                              }
                              disabled={updatePromo.isPending}
                            >
                              Toggle
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bundles" className="mt-4">
            <div className="mb-4 flex justify-end">
              <Dialog open={bundleOpen} onOpenChange={setBundleOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Bundle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Bundle</DialogTitle>
                    <DialogDescription>
                      Create a bundle with multiple products and a set price.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label>Bundle name</Label>
                      <Input value={bundleName} onChange={(e) => setBundleName(e.target.value)} placeholder="e.g. Coffee Combo" />
                    </div>
                    <div>
                      <Label>Description (optional)</Label>
                      <Input value={bundleDesc} onChange={(e) => setBundleDesc(e.target.value)} placeholder="Bundle description" />
                    </div>
                    <div>
                      <Label>Bundle price</Label>
                      <Input type="number" min="0" value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value)} placeholder="50000" />
                    </div>
                    <div>
                      <Label>Products in bundle</Label>
                      <div className="flex gap-2 mb-2">
                        <Select value={selProductId} onValueChange={setSelProductId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {menuItems.map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="1"
                          className="w-20"
                          value={selQty}
                          onChange={(e) => setSelQty(e.target.value)}
                        />
                        <Button type="button" variant="outline" onClick={handleAddBundleProduct} disabled={!selProductId}>
                          Add
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {bundleProductIds.map((pid, idx) => {
                          const m = menuItems.find((x) => x.id === pid);
                          return (
                            <div key={pid} className="flex items-center justify-between p-2 border rounded text-sm">
                              <span>{m?.name ?? pid} x {bundleQuantities[idx]}</span>
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveBundleProduct(idx)}>Remove</Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBundleOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => void handleCreateBundle()}
                      disabled={!bundleName || bundleProductIds.length === 0 || !bundlePrice || createBundle.isPending}
                    >
                      {createBundle.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Bundles</CardTitle>
                <CardDescription>Product bundles with fixed price</CardDescription>
              </CardHeader>
              <CardContent>
                {bundlesLoading ? (
                  <div className="flex items-center gap-2 py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : bundles.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No bundles yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Products</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bundles.map((b) => (
                        <TableRow key={(b as { id: string }).id}>
                          <TableCell className="font-medium">{(b as { name: string }).name}</TableCell>
                          <TableCell>Rp {(b as { bundle_price: number }).bundle_price?.toLocaleString("id-ID") ?? 0}</TableCell>
                          <TableCell>{(b as { product_ids?: string[] }).product_ids?.length ?? 0} items</TableCell>
                          <TableCell>
                            <Badge variant={(b as { is_active: boolean }).is_active ? "default" : "secondary"}>
                              {(b as { is_active: boolean }).is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateBundle.mutate({
                                  id: (b as { id: string }).id,
                                  isActive: !(b as { is_active: boolean }).is_active,
                                })
                              }
                              disabled={updateBundle.isPending}
                            >
                              Toggle
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </QueryBoundary>
      </div>
    </DashboardLayout>
  );
}
