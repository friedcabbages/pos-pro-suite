import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { OfflineBanner } from "@/components/OfflineBanner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-60 transition-all duration-200">
        <OfflineBanner />
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
