import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const transactions = [
  {
    id: "TXN-001",
    customer: "Walk-in Customer",
    amount: "$125.50",
    items: 5,
    status: "completed",
    time: "2 min ago",
  },
  {
    id: "TXN-002",
    customer: "John Smith",
    amount: "$89.00",
    items: 3,
    status: "completed",
    time: "15 min ago",
  },
  {
    id: "TXN-003",
    customer: "Maria Garcia",
    amount: "$234.75",
    items: 8,
    status: "pending",
    time: "32 min ago",
  },
  {
    id: "TXN-004",
    customer: "Walk-in Customer",
    amount: "$45.00",
    items: 2,
    status: "completed",
    time: "1 hour ago",
  },
  {
    id: "TXN-005",
    customer: "Robert Chen",
    amount: "$567.25",
    items: 12,
    status: "completed",
    time: "2 hours ago",
  },
];

export function RecentTransactions() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Recent Transactions</h3>
          <p className="text-sm text-muted-foreground">Latest sales activity</p>
        </div>
        <button className="text-sm font-medium text-primary hover:underline">
          View all
        </button>
      </div>

      <div className="space-y-2">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center gap-3 rounded-md p-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  {transaction.id}
                </p>
                <Badge
                  variant={transaction.status === "completed" ? "default" : "secondary"}
                  className="text-xs font-normal"
                >
                  {transaction.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {transaction.customer} • {transaction.items} items
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {transaction.amount}
              </p>
              <p className="text-xs text-muted-foreground">{transaction.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
