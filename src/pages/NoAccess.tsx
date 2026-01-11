import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NoAccess() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">No Access</h1>
          <p className="text-muted-foreground">
            Your account is not associated with any business. Please contact your administrator to get access.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 text-left space-y-4">
          <h3 className="font-semibold text-foreground">What to do next:</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Contact your business administrator</li>
            <li>• Request to be added to the system</li>
            <li>• If you're a business owner, contact our sales team</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/marketing")}
            className="w-full"
          >
            Contact Sales
          </Button>
        </div>
      </div>
    </div>
  );
}