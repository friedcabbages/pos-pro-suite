import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, MoreHorizontal, Shield, User, UserCog } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { Skeleton } from "@/components/ui/skeleton";

interface UserWithRole {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "cashier";
  branch_id: string | null;
  profile?: {
    full_name: string | null;
    phone: string | null;
  };
  branch?: {
    name: string;
  };
}

const roleIcons = {
  owner: Shield,
  admin: UserCog,
  cashier: User,
};

const roleColors = {
  owner: "bg-primary/10 text-primary border-primary/30",
  admin: "bg-warning/10 text-warning border-warning/30",
  cashier: "bg-secondary text-secondary-foreground border-border",
};

export default function Users() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { business } = useBusiness();

  useEffect(() => {
    if (!business?.id) return;

    const fetchUsers = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          id,
          user_id,
          role,
          branch_id
        `)
        .eq("business_id", business.id);

      if (data) {
        // Fetch profiles for each user
        const userIds = data.map(u => u.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", userIds);

        // Fetch branches
        const branchIds = data.filter(u => u.branch_id).map(u => u.branch_id!);
        const { data: branches } = await supabase
          .from("branches")
          .select("id, name")
          .in("id", branchIds);

        const usersWithData = data.map(user => ({
          ...user,
          profile: profiles?.find(p => p.id === user.user_id),
          branch: branches?.find(b => b.id === user.branch_id),
        }));

        setUsers(usersWithData);
      }
      setIsLoading(false);
    };

    fetchUsers();
  }, [business?.id]);

  const filteredUsers = users.filter(
    (user) =>
      (user.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const ownerCount = users.filter(u => u.role === "owner").length;
  const adminCount = users.filter(u => u.role === "admin").length;
  const cashierCount = users.filter(u => u.role === "cashier").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Users
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage user accounts and access permissions
            </p>
          </div>
          <Button variant="glow">
            <Plus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </div>

        {/* Role Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{ownerCount}</p>
                <p className="text-sm text-muted-foreground">Owner</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <UserCog className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{adminCount}</p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <User className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{cashierCount}</p>
                <p className="text-sm text-muted-foreground">Cashiers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 rounded-xl border border-border bg-card p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const RoleIcon = roleIcons[user.role];
                    return (
                      <TableRow key={user.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                              {user.profile?.full_name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .substring(0, 2)
                                .toUpperCase() || "??"}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {user.profile?.full_name || "Unknown"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {user.profile?.phone || "No phone"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={roleColors[user.role]}
                          >
                            <RoleIcon className="mr-1 h-3 w-3" />
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.branch?.name || "All Branches"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Edit Role</DropdownMenuItem>
                              <DropdownMenuItem>Change Branch</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Remove Access
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
