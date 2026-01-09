import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Building2, 
  Users, 
  FileText, 
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Businesses', path: '/admin', icon: Building2 },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Audit Logs', path: '/admin/logs', icon: FileText },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-destructive rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-destructive-foreground" />
            </div>
            <div>
              <span className="font-bold text-foreground">Super Admin</span>
              <p className="text-xs text-muted-foreground">Internal Only</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground"
            onClick={() => navigate('/')}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Back to Hub
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 border-b border-border bg-card flex items-center px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Super Admin</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">
              {navItems.find(item => isActive(item.path))?.label || 'Dashboard'}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
