import { Link, useLocation } from "wouter";
import { LayoutDashboard, Wallet, ShoppingBag, KanbanSquare, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import komershLogo from "@assets/Komersh_(one-click_black_color)_1769958478589.png";
import { cn } from "@/lib/utils";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Financials', href: '/financials', icon: Wallet },
  { name: 'Products', href: '/products', icon: ShoppingBag },
  { name: 'Tasks', href: '/tasks', icon: KanbanSquare },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-72 flex-col bg-card border-r border-border/50">
      <div className="flex h-20 shrink-0 items-center px-6 gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-lg bg-white/10 p-1">
          <img className="h-full w-full object-contain" src={komershLogo} alt="Komersh Logo" />
        </div>
        <span className="font-display text-2xl font-bold tracking-tight text-white">Komersh</span>
      </div>
      
      <div className="flex flex-1 flex-col gap-y-7 px-6 py-4">
        <nav className="flex flex-1 flex-col gap-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div 
                  className={cn(
                    "group flex gap-x-3 rounded-xl p-3 text-sm font-semibold leading-6 cursor-pointer transition-all duration-200",
                    isActive 
                      ? "bg-primary text-white shadow-lg shadow-primary/25" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className={cn("h-6 w-6 shrink-0", isActive ? "text-white" : "text-muted-foreground group-hover:text-white")} aria-hidden="true" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div className="flex items-center gap-x-4 rounded-xl bg-white/5 p-4 mb-4">
            <img
              className="h-10 w-10 rounded-full bg-primary/20"
              src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=random`}
              alt=""
            />
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            </div>
          </div>
          
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-x-3 rounded-xl p-3 text-sm font-semibold leading-6 text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
