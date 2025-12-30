import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useExpenses } from "@/hooks/useExpenses";
import { useBusiness } from "@/contexts/BusinessContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const categoryColors: Record<string, string> = {
  rent: "bg-primary/10 text-primary",
  utilities: "bg-warning/10 text-warning",
  salary: "bg-success/10 text-success",
  operational: "bg-secondary text-secondary-foreground",
  marketing: "bg-accent/10 text-accent-foreground",
  other: "bg-muted text-muted-foreground",
};

const expenseCategories = ["rent", "utilities", "salary", "operational", "marketing", "other"];

export default function Expenses() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "operational",
    description: "",
    amount: 0,
    expense_date: new Date().toISOString().split("T")[0],
  });

  const { expenses, isLoading, createExpense } = useExpenses();
  const { business, branch } = useBusiness();
  const { toast } = useToast();

  const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const avgExpense = expenses?.length ? totalExpenses / expenses.length : 0;

  const filteredExpenses = expenses?.filter(
    (exp) =>
      (exp.description?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      exp.category.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const formatCurrency = (value: number) => {
    const currency = business?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleCreate = () => {
    if (!formData.description.trim() || formData.amount <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    createExpense.mutate({
      category: formData.category,
      description: formData.description,
      amount: formData.amount,
      expense_date: formData.expense_date,
      branch_id: branch?.id || null,
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormData({
          category: "operational",
          description: "",
          amount: 0,
          expense_date: new Date().toISOString().split("T")[0],
        });
        toast({ title: "Expense created" });
      },
      onError: (error: any) => {
        toast({ title: "Failed to create expense", description: error.message, variant: "destructive" });
      },
    });
  };

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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glow">
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Expense description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.expense_date}
                      onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createExpense.isPending}>
                  {createExpense.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Expense
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                  {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(totalExpenses)}
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
                  {isLoading ? <Skeleton className="h-8 w-20" /> : formatCurrency(avgExpense)}
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
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : expenses?.length || 0}
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
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No expenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className="group">
                      <TableCell className="text-muted-foreground">
                        {format(new Date(expense.expense_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={categoryColors[expense.category.toLowerCase()] || categoryColors.other}
                        >
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {expense.description}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        -{formatCurrency(expense.amount)}
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
