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
import { Calendar, Search, Download, Eye, Receipt, Filter } from "lucide-react";

const transactions = [
  {
    id: "TXN-2024-001",
    date: "2024-01-15 14:32",
    customer: "Walk-in Customer",
    items: 5,
    subtotal: 125.5,
    discount: 10,
    total: 115.5,
    payment: "Cash",
    status: "completed",
    cashier: "John Doe",
  },
  {
    id: "TXN-2024-002",
    date: "2024-01-15 13:45",
    customer: "Maria Garcia",
    items: 3,
    subtotal: 89.0,
    discount: 0,
    total: 89.0,
    payment: "Card",
    status: "completed",
    cashier: "Jane Smith",
  },
  {
    id: "TXN-2024-003",
    date: "2024-01-15 12:20",
    customer: "Robert Chen",
    items: 8,
    subtotal: 234.75,
    discount: 15,
    total: 219.75,
    payment: "QRIS",
    status: "completed",
    cashier: "John Doe",
  },
  {
    id: "TXN-2024-004",
    date: "2024-01-15 11:15",
    customer: "Walk-in Customer",
    items: 2,
    subtotal: 45.0,
    discount: 0,
    total: 45.0,
    payment: "Cash",
    status: "refunded",
    cashier: "Jane Smith",
  },
  {
    id: "TXN-2024-005",
    date: "2024-01-15 10:05",
    customer: "Ahmad Yusuf",
    items: 12,
    subtotal: 567.25,
    discount: 25,
    total: 542.25,
    payment: "Transfer",
    status: "completed",
    cashier: "John Doe",
  },
];

const statusStyles = {
  completed: "bg-success/10 text-success border-success/30",
  refunded: "bg-warning/10 text-warning border-warning/30",
  pending: "bg-muted text-muted-foreground border-border",
};

const paymentStyles = {
  Cash: "bg-primary/10 text-primary",
  Card: "bg-secondary text-secondary-foreground",
  QRIS: "bg-accent/10 text-accent-foreground",
  Transfer: "bg-muted text-muted-foreground",
};

export default function Transactions() {
  const [search, setSearch] = useState("");

  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.id.toLowerCase().includes(search.toLowerCase()) ||
      tx.customer.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = transactions
    .filter((tx) => tx.status === "completed")
    .reduce((sum, tx) => sum + tx.total, 0);

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
            <p className="text-sm text-muted-foreground">Today's Transactions</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {transactions.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="mt-1 text-2xl font-bold text-primary">
              ${totalRevenue.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Average Order</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              ${(totalRevenue / transactions.filter((tx) => tx.status === "completed").length).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by transaction ID or customer..."
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((tx) => (
                <TableRow key={tx.id} className="group">
                  <TableCell className="font-mono text-sm font-medium text-foreground">
                    {tx.id}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tx.date}
                  </TableCell>
                  <TableCell>{tx.customer}</TableCell>
                  <TableCell className="text-right">{tx.items}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    ${tx.total.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={paymentStyles[tx.payment as keyof typeof paymentStyles]}
                    >
                      {tx.payment}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusStyles[tx.status as keyof typeof statusStyles]}
                    >
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tx.cashier}
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
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
