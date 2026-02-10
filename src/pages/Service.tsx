import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors } from "lucide-react";

export default function Service() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scissors className="h-6 w-6" />
              <CardTitle>Service Module</CardTitle>
            </div>
            <CardDescription>Module in progress - Coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The Service POS module is currently under development. 
              This module will include features specific to service-based businesses like barbershops, salons, and other service providers.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
