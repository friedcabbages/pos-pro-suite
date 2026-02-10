import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, MoreHorizontal, Shield, User, UserCog, Loader2, Trash2, Monitor, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUsers, useCreateUser, useDeleteUser, useUpdateUserRole } from "@/hooks/useUsers";
import { useBusiness } from "@/contexts/BusinessContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useUpgradeModal } from "@/contexts/UpgradeModalContext";
import {
  useUserSessions,
  useRevokeUserSession,
  useRevokeOtherSessions,
  useRevokeAllSessions,
} from "@/hooks/useUserSessions";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sessionAction, setSessionAction] = useState<{
    type: "one" | "others" | "all";
    userId?: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    username: "",
    role: "cashier" as "admin" | "cashier",
    branch_id: "",
  });

  const { user } = useAuth();
  const { business, branches, isOwner, isAdmin } = useBusiness();
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const updateUserRole = useUpdateUserRole();
  const canManageSessions = isOwner || isAdmin;
  const userSessions = useUserSessions(canManageSessions);
  const revokeUserSession = useRevokeUserSession();
  const revokeOtherSessions = useRevokeOtherSessions();
  const revokeAllSessions = useRevokeAllSessions();
  const plan = usePlanAccess();
  const upgrade = useUpgradeModal();

  const currentUsersCount = users?.length || 0;
  const maxUsers = plan.limits.maxUsers;
  const isAtUserLimit = maxUsers !== null && currentUsersCount >= maxUsers;
  const sessionLimit = 1;
  const activeSessionCount = userSessions.data?.sessions?.length ?? 0;
  const isSessionActionPending =
    revokeUserSession.isPending || revokeOtherSessions.isPending || revokeAllSessions.isPending;

  // Counters are calculated from the full users list (before search filter)
  const ownerCount = users?.filter((u) => u.role === "owner").length || 0;
  const adminCount = users?.filter((u) => u.role === "admin").length || 0;
  const cashierCount = users?.filter((u) => u.role === "cashier").length || 0;

  // Filter users based on search - include all users, even those without names
  const filteredUsers = users?.filter((user) => {
    if (!search.trim()) return true;
    const name = user.profile?.full_name?.toLowerCase() || "";
    return name.includes(search.toLowerCase());
  }) || [];

  const handleCreate = () => {
    if (isAtUserLimit) {
      upgrade.open({
        reason: "limit",
        requiredPlan: plan.planName === "basic" ? "pro" : "enterprise",
        message: "You’ve reached your user limit. Upgrade now to add more users and keep your team running smoothly.",
        highlights: ["More users", "Better controls", "Advanced reporting"],
      });
      return;
    }

    if (!formData.email.trim() || !formData.password.trim() || !formData.full_name.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    createUser.mutate(
      {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone || undefined,
        username: formData.username.trim() || undefined,
        role: formData.role,
        branch_id: formData.branch_id || undefined,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setFormData({
            email: "",
            password: "",
            full_name: "",
            phone: "",
            username: "",
            role: "cashier",
            branch_id: "",
          });
        },
        onError: (err: any) => {
          const msg = String(err?.message || "");
          if (msg.includes("LIMIT_MAX_USERS") || msg.toLowerCase().includes("user limit")) {
            upgrade.open({
              reason: "limit",
              requiredPlan: plan.planName === "basic" ? "pro" : "enterprise",
              message:
                "Your plan allows a limited number of users. Upgrade now to add more users and unlock more features.",
              highlights: ["More users", "Expenses", "Purchase Orders"],
            });
          }
        },
      }
    );
  };

  const handleDelete = (id: string, role: string) => {
    if (role === "owner") {
      toast.error("Cannot remove the owner");
      return;
    }
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteUser.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const confirmSessionAction = () => {
    if (!sessionAction) return;
    if (sessionAction.type === "one" && sessionAction.userId) {
      revokeUserSession.mutate(sessionAction.userId, { onSettled: () => setSessionAction(null) });
      return;
    }
    if (sessionAction.type === "others" && sessionAction.userId) {
      revokeOtherSessions.mutate(sessionAction.userId, { onSettled: () => setSessionAction(null) });
      return;
    }
    if (sessionAction.type === "all") {
      revokeAllSessions.mutate(undefined, { onSettled: () => setSessionAction(null) });
    }
  };

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
          {isOwner && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <div>
                <Button
                  onClick={() => {
                    if (isAtUserLimit) {
                      upgrade.open({
                        reason: "limit",
                        requiredPlan: plan.planName === "basic" ? "pro" : "enterprise",
                        message:
                          "You’ve reached your user limit. Upgrade now to add more users and unlock more features.",
                        highlights: ["More users", "Expenses", "Purchase Orders"],
                      });
                      return;
                    }
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
                {maxUsers !== null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {currentUsersCount}/{maxUsers} users
                  </p>
                )}
              </div>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Username (optional)</Label>
                    <Input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="username (3-30 chars, letters, numbers, underscore)"
                      pattern="[a-zA-Z0-9_]{3,30}"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. If set, user can login with username or email.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+62 8xxx xxxx xxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(v) => setFormData({ ...formData, role: v as "admin" | "cashier" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin - Full access</SelectItem>
                        <SelectItem value="cashier">Cashier - POS only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {branches.length > 1 && (
                    <div className="space-y-2">
                      <Label>Branch (optional)</Label>
                      <Select
                        value={formData.branch_id}
                        onValueChange={(v) => setFormData({ ...formData, branch_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All branches" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Branches</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button onClick={handleCreate} className="w-full" disabled={createUser.isPending}>
                    {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
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
                              {user.profile?.phone && (
                                <p className="text-sm text-muted-foreground">
                                  {user.profile.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleColors[user.role]}>
                            <RoleIcon className="mr-1 h-3 w-3" />
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.branch?.name || "All Branches"}
                        </TableCell>
                        <TableCell>
                          {isOwner && user.role !== "owner" && (
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
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateUserRole.mutate({
                                      id: user.id,
                                      role: user.role === "admin" ? "cashier" : "admin",
                                    })
                                  }
                                >
                                  <UserCog className="mr-2 h-4 w-4" />
                                  Change to {user.role === "admin" ? "Cashier" : "Admin"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(user.id, user.role)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove Access
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Active Sessions */}
        {canManageSessions && (
        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex flex-col gap-3 border-b border-border p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Active Sessions</h3>
              <p className="text-sm text-muted-foreground">
                See who is signed in and reclaim sessions when needed.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="text-xs">
                {activeSessionCount}/{sessionLimit} sessions
              </Badge>
              <Button
                variant="outline"
                onClick={() => setSessionAction({ type: "all" })}
                disabled={userSessions.isLoading || activeSessionCount === 0}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout all sessions
              </Button>
            </div>
          </div>
          {userSessions.isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !userSessions.data?.sessions?.length ? (
            <div className="p-6 text-sm text-muted-foreground">
              No active sessions detected yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userSessions.data.sessions.map((sessionRow) => {
                  const isCurrent = user?.id === sessionRow.user_id;
                  const userLabel = sessionRow.user_full_name || sessionRow.user_email || "Unknown user";
                  return (
                    <TableRow key={sessionRow.user_id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                            <Monitor className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {sessionRow.session_label || "Session"}
                            </p>
                            {isCurrent && (
                              <Badge variant="outline" className="mt-1 text-[10px]">
                                This session
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{userLabel}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(sessionRow.last_seen), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setSessionAction({ type: "one", userId: sessionRow.user_id })}
                            >
                              Logout this session
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSessionAction({ type: "others", userId: sessionRow.user_id })}
                            >
                              Logout all sessions except this one
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this user's access? They will no longer be able to access
              the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!sessionAction} onOpenChange={() => setSessionAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {sessionAction?.type === "all"
                ? "Logout all sessions"
                : sessionAction?.type === "others"
                  ? "Logout other sessions"
                  : "Logout this session"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {sessionAction?.type === "all"
                ? "This will log out all sessions currently signed in."
                : sessionAction?.type === "others"
                  ? "This will log out every session except the one you selected."
                  : "This session will be logged out on its next session check."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSessionAction}
              className="bg-destructive text-destructive-foreground"
              disabled={isSessionActionPending}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
