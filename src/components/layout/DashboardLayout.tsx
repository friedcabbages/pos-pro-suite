import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useDeviceSession } from "@/hooks/useDeviceSession";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  useDeviceSession();
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-60 transition-all duration-200">
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
