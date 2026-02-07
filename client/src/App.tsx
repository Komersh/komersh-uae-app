import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "@/components/ThemeProvider";

// Pages
import Dashboard from "@/pages/Dashboard";
import Financials from "@/pages/Financials";
import Products from "@/pages/Products";
import Tasks from "@/pages/Tasks";
import Files from "@/pages/Files";
import Users from "@/pages/Users";
import Account from "@/pages/Account";
import Login from "@/pages/Login";
import AcceptInvitation from "@/pages/AcceptInvitation";

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  // ✅ Allow accept-invitation page even if not logged in
  if (location.startsWith("/accept-invitation")) {
    return (
      <Switch>
        <Route path="/accept-invitation" component={AcceptInvitation} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-primary">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/financials" component={Financials} />
      <Route path="/products" component={Products} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/files" component={Files} />
      <Route path="/users" component={Users} />
      <Route path="/account" component={Account} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
