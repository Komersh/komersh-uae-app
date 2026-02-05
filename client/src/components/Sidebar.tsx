import { Link, useLocation } from "wouter";
import { LayoutDashboard, Wallet, ShoppingBag, KanbanSquare, LogOut, FolderOpen, Users, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";
import komershLogoLight from "@assets/Komersh_(one-click_black_color)_(1)_1770316808493.png";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Financials', href: '/financials', icon: Wallet },
  { name: 'Products', href: '/products', icon: ShoppingBag },
  { name: 'Tasks', href: '/tasks', icon: KanbanSquare },
  { name: 'Files', href: '/files', icon: FolderOpen },
  { name: 'Users', href: '/users', icon: Users },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-72 flex-col bg-card border-r border-border">
      <div className="flex h-20 shrink-0 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="h-12 overflow-hidden">
            <img 
              className="h-full w-auto object-contain" 
              src={komershLogoLight} 
              alt="Komersh Logo" 
            />
          </div>
        </div>
        <ThemeToggle />
      </div>
      
      <div className="flex flex-1 flex-col gap-y-7 px-4 py-4">
        <nav className="flex flex-1 flex-col gap-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href} onClick={onNavigate}>
                <div 
                  className={cn(
                    "group flex gap-x-3 rounded-xl p-3 text-sm font-semibold leading-6 cursor-pointer transition-all duration-200",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} aria-hidden="true" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <Link href="/account" onClick={onNavigate}>
            <div 
              className="flex items-center gap-x-4 rounded-xl bg-muted p-4 mb-4 cursor-pointer hover:bg-muted/80 transition-colors"
              data-testid="nav-account"
            >
              <img
                className="h-10 w-10 rounded-full bg-primary/20 object-cover"
                src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=9333ea&color=fff`}
                alt=""
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold text-foreground truncate">{user?.firstName} {user?.lastName}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
              </div>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
          
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-x-3 rounded-xl p-3 text-sm font-semibold leading-6 text-destructive hover:bg-destructive/10 transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
