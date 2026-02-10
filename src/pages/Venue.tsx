import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function Venue() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              <CardTitle>Venue Module</CardTitle>
            </div>
            <CardDescription>Module in progress - Coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The Venue POS module is currently under development. 
              This module will include features specific to entertainment venues like badminton courts, futsal fields, and other rental facilities.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
