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
import { Calendar, Search, Download, Eye, Filter } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { useBusiness } from "@/contexts/BusinessContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const paymentStyles: Record<string, string> = {
  cash: "bg-primary/10 text-primary",
  card: "bg-secondary text-secondary-foreground",
  qris: "bg-accent/10 text-accent-foreground",
  transfer: "bg-muted text-muted-foreground",
  other: "bg-muted text-muted-foreground",
};

export default function Transactions() {
  const [search, setSearch] = useState("");
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
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
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
      </div>
    </DashboardLayout>
  );
}
