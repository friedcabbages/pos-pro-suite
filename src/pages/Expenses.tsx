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
  Plus,
  Search,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Building2,
  Zap,
  Users,
  Truck,
} from "lucide-react";

const expenses = [
  {
    id: "EXP-001",
    date: "2024-01-15",
    category: "Rent",
    description: "Monthly store rent - Main Branch",
    amount: 2500.0,
    warehouse: "Main Warehouse",
    icon: Building2,
  },
  {
    id: "EXP-002",
    date: "2024-01-14",
    category: "Utilities",
    description: "Electricity bill - January",
    amount: 450.0,
    warehouse: "Main Warehouse",
    icon: Zap,
  },
  {
    id: "EXP-003",
    date: "2024-01-13",
    category: "Salary",
    description: "Staff salary - Week 2",
    amount: 3200.0,
    warehouse: "Global",
    icon: Users,
  },
  {
    id: "EXP-004",
    date: "2024-01-12",
    category: "Operational",
    description: "Delivery truck fuel",
    amount: 180.0,
    warehouse: "Distribution Center",
    icon: Truck,
  },
  {
    id: "EXP-005",
    date: "2024-01-11",
    category: "Utilities",
    description: "Internet and phone",
    amount: 120.0,
    warehouse: "Main Warehouse",
    icon: Zap,
  },
];

const categoryColors = {
  Rent: "bg-primary/10 text-primary",
  Utilities: "bg-warning/10 text-warning",
  Salary: "bg-success/10 text-success",
  Operational: "bg-secondary text-secondary-foreground",
};

export default function Expenses() {
  const [search, setSearch] = useState("");

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgExpense = totalExpenses / expenses.length;

  const filteredExpenses = expenses.filter(
    (exp) =>
      exp.description.toLowerCase().includes(search.toLowerCase()) ||
      exp.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Expenses
            </h1>
            <p className="mt-1 text-muted-foreground">
              Track and manage business expenses
            </p>
          </div>
          <Button variant="glow">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalExpenses.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Expense</p>
                <p className="text-2xl font-bold text-foreground">
                  ${avgExpense.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-foreground">
                  {expenses.length} entries
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search expenses..."
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
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Expenses Table */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id} className="group">
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {expense.id}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {expense.date}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={categoryColors[expense.category as keyof typeof categoryColors]}
                    >
                      <expense.icon className="mr-1 h-3 w-3" />
                      {expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {expense.description}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {expense.warehouse}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    -${expense.amount.toFixed(2)}
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
