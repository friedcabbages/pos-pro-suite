import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { Clock, LogOut, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SubscriptionRequired() {
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
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-warning/10">
          <Clock className="h-10 w-10 text-warning" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Subscription Required</h1>
          <p className="text-muted-foreground">
            Your trial for <span className="font-semibold">{business?.name}</span> has ended.
          </p>
        </div>

        <div className="rounded-xl border border-warning/50 bg-warning/5 p-6 text-left space-y-4">
          <h3 className="font-semibold text-foreground">Your trial period has expired</h3>
          <p className="text-sm text-muted-foreground">
            Please contact your administrator or our sales team to activate your subscription and regain full access to VeloPOS.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => window.location.href = 'mailto:sales@velopos.com?subject=Subscription Inquiry'}
            className="w-full"
          >
            <Mail className="mr-2 h-4 w-4" />
            Contact Admin
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
          Need help? Email us at sales@velopos.com
        </p>
      </div>
    </div>
  );
}