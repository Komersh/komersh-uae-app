import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, TrendingUp, ShoppingCart, BarChart3, Mail, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import komershLogo from "@assets/Komersh_(one-click_black_color)_1769958478589.png";

export default function Login() {
  const { toast } = useToast();
  const [loginMode, setLoginMode] = useState<"replit" | "email">("replit");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReplitLogin = () => {
    window.location.href = "/api/login";
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Error", description: "Please enter email and password", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        toast({ title: "Login Failed", description: data.message, variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Logged in successfully" });
      window.location.href = "/";
    } catch (err) {
      toast({ title: "Error", description: "Login failed. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-[-15%] right-[-5%] w-[700px] h-[700px] bg-primary/15 rounded-full blur-[150px] animate-pulse" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px]" />

      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative">
        <div className="max-w-lg">
          <h1 className="text-5xl font-display font-bold text-foreground mb-6 leading-tight">
            Manage Your <span className="text-primary">E-Commerce</span> Empire
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Track inventory, manage finances, and grow your business on Amazon UAE and beyond.
          </p>
          
          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border">
              <div className="p-2 rounded-lg bg-primary/20 text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">Inventory</p>
                <p className="text-xs text-muted-foreground">Stock tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">Revenue</p>
                <p className="text-xs text-muted-foreground">Sales analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">Multi-Channel</p>
                <p className="text-xs text-muted-foreground">Amazon, Noon & more</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border">
              <div className="p-2 rounded-lg bg-orange-500/20 text-orange-500">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">Analytics</p>
                <p className="text-xs text-muted-foreground">Financial insights</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Card */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Card className="bg-card/80 backdrop-blur-xl border-border shadow-2xl">
            <CardContent className="pt-10 pb-10 px-8 text-center flex flex-col items-center">
              {/* Logo */}
              <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-600/10 border border-border shadow-inner">
                <img 
                  src={komershLogo} 
                  alt="Komersh Logo" 
                  className="h-16 w-auto object-contain"
                />
              </div>
              
              <h1 className="text-3xl font-display font-bold text-foreground mb-1">Komersh UAE</h1>
              <p className="text-muted-foreground mb-6">
                Sign in to access your e-commerce command center
              </p>

              {/* Login Mode Toggle */}
              <div className="flex w-full rounded-lg bg-muted p-1 mb-6">
                <button
                  onClick={() => setLoginMode("replit")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    loginMode === "replit" 
                      ? "bg-background text-foreground shadow" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Replit
                </button>
                <button
                  onClick={() => setLoginMode("email")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    loginMode === "email" 
                      ? "bg-background text-foreground shadow" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Email
                </button>
              </div>

              {loginMode === "replit" ? (
                <Button 
                  onClick={handleReplitLogin}
                  size="lg"
                  className="w-full h-12 text-lg font-semibold bg-primary text-white shadow-lg shadow-primary/30"
                  data-testid="button-login"
                >
                  Log In with Replit
                </Button>
              ) : (
                <form onSubmit={handleEmailLogin} className="w-full space-y-4">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="email" className="text-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-background border-border"
                        data-testid="input-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 text-left">
                    <Label htmlFor="password" className="text-foreground">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 bg-background border-border"
                        data-testid="input-password"
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit"
                    size="lg"
                    disabled={isLoading}
                    className="w-full h-12 text-lg font-semibold bg-primary text-white shadow-lg shadow-primary/30"
                    data-testid="button-email-login"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              )}

              <p className="text-xs text-muted-foreground mt-6">
                Internal access only. Contact admin for invitation.
              </p>
            </CardContent>
          </Card>

          {/* Mobile Feature List */}
          <div className="lg:hidden mt-8 flex justify-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="text-sm">Inventory</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Sales</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">Analytics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
