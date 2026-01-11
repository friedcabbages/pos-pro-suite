import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { Ban, LogOut, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AccountSuspended() {
  const { signOut } = useAuth();
  const { business } = useBusiness();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <Ban className="h-10 w-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Account Suspended</h1>
          <p className="text-muted-foreground">
            Access to <span className="font-semibold">{business?.name}</span> has been suspended.
          </p>
        </div>

        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-left space-y-4">
          <h3 className="font-semibold text-foreground">Your account has been suspended</h3>
          <p className="text-sm text-muted-foreground">
            This may be due to a policy violation or administrative action. Please contact support to resolve this issue.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => window.location.href = 'mailto:support@velopos.com?subject=Account Suspension Inquiry'}
            className="w-full"
          >
            <Mail className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Need help? Email us at support@velopos.com
        </p>
      </div>
    </div>
  );
}