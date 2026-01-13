import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ImpersonationBanner() {
  const { isImpersonating, businessName, exitImpersonation } = useImpersonation();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleExit = () => {
    exitImpersonation();
    navigate('/admin');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-warning text-warning-foreground px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-warning-foreground/10 rounded">
            <Eye className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">
              You are impersonating: <strong>{businessName}</strong>
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExit}
          className="bg-warning-foreground/10 border-warning-foreground/20 hover:bg-warning-foreground/20"
        >
          <X className="h-4 w-4 mr-2" />
          Exit Impersonation
        </Button>
      </div>
    </div>
  );
}
