import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function UpgradeModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  highlights: string[];
}) {
  const navigate = useNavigate();

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            {props.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{props.message}</p>

          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">You’ll unlock:</p>
            <ul className="mt-2 space-y-1">
              {props.highlights.map((h) => (
                <li key={h} className="text-sm text-foreground">
                  • {h}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => props.onOpenChange(false)}>
              Not now
            </Button>
            <Button
              onClick={() => {
                props.onOpenChange(false);
                navigate("/subscription");
              }}
            >
              Upgrade now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
