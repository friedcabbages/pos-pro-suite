import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Search, Download, Eye, Filter } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { useBusiness } from "@/contexts/BusinessContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";

const paymentStyles: Record<string, string> = {
  cash: "bg-primary/10 text-primary",
  card: "bg-secondary text-secondary-foreground",
  qris: "bg-accent/10 text-accent-foreground",
  transfer: "bg-muted text-muted-foreground",
  other: "bg-muted text-muted-foreground",
};

export default function Transactions() {
  const [search, setSearch] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { data: sales, isLoading } = useSales();
  const { business } = useBusiness();

  const filteredTransactions = sales?.filter(
    (tx) =>
      tx.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (tx.customer_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
  ) || [];

  const totalRevenue = sales?.reduce((sum, tx) => sum + tx.total, 0) || 0;
  const completedCount = sales?.length || 0;
  const avgOrder = completedCount > 0 ? totalRevenue / completedCount : 0;

  const formatCurrency = (value: number) => {
    const currency = business?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    setIsExporting(true);
    try {
      const headers = ["Invoice", "Date & Time", "Customer", "Items", "Total", "Payment Method"];
      const rows = filteredTransactions.map((tx) => [
        tx.invoice_number,
        format(new Date(tx.created_at), "yyyy-MM-dd HH:mm:ss"),
        tx.customer_name || "Walk-in",
        (tx.items?.length || 0).toString(),
        tx.total.toString(),
        tx.payment_method,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Transactions exported successfully");
    } catch (error) {
      toast.error("Failed to export transactions");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Transactions
            </h1>
            <p className="mt-1 text-muted-foreground">
              View and manage all sales transactions
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Total Transactions</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-8 w-20" /> : completedCount}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Average Order</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-8 w-20" /> : formatCurrency(avgOrder)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by invoice or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Date Range
          </Button>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Transactions Table */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="group">
                      <TableCell className="font-mono text-sm font-medium text-foreground">
                        {tx.invoice_number}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>{tx.customer_name || "Walk-in"}</TableCell>
                      <TableCell className="text-right">
                        {tx.items?.length || 0}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(tx.total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={paymentStyles[tx.payment_method] || paymentStyles.other}
                        >
                          {tx.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={() => setSelectedTransaction(tx)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Transaction Details Dialog */}
        <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-6">
                {/* Transaction Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Number</p>
                    <p className="font-mono font-medium">{selectedTransaction.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date & Time</p>
                    <p className="font-medium">
                      {format(new Date(selectedTransaction.created_at), "PPpp")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedTransaction.customer_name || "Walk-in"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <Badge
                      variant="secondary"
                      className={paymentStyles[selectedTransaction.payment_method] || paymentStyles.other}
                    >
                      {selectedTransaction.payment_method}
                    </Badge>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Items</p>
                  <div className="rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTransaction.items?.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.product?.name || "Unknown Product"}</p>
                                {item.product?.sku && (
                                  <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.sell_price)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-2 pt-4 border-t border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedTransaction.subtotal)}</span>
                  </div>
                  {selectedTransaction.discount_amount > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Discount</span>
                      <span>-{formatCurrency(selectedTransaction.discount_amount)}</span>
                    </div>
                  )}
                  {selectedTransaction.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(selectedTransaction.tax_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(selectedTransaction.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid</span>
                    <span>{formatCurrency(selectedTransaction.payment_amount)}</span>
                  </div>
                  {selectedTransaction.change_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Change</span>
                      <span>{formatCurrency(selectedTransaction.change_amount)}</span>
                    </div>
                  )}
                </div>

                {selectedTransaction.notes && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="mt-1">{selectedTransaction.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}