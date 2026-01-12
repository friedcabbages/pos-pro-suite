import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { ShieldX, LogOut, Home, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AccessDenied() {
  const { signOut } = useAuth();
  const { userRole } = useBusiness();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    // Redirect based on role
    if (userRole?.role === 'cashier') {
      navigate('/pos');
    } else {
      navigate('/app');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-warning/10">
          <ShieldX className="h-10 w-10 text-warning" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 text-left space-y-4">
          <h3 className="font-semibold text-foreground">What happened?</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• This page requires higher permission level</li>
            <li>• Your current role: <span className="font-medium text-foreground capitalize">{userRole?.role || 'Unknown'}</span></li>
            <li>• Contact your administrator if you need access</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleGoHome} className="w-full">
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
          <Button variant="outline" onClick={handleGoBack} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button variant="ghost" onClick={handleSignOut} className="w-full text-muted-foreground">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
