import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import komershLogo from "@assets/Komersh_(one-click_black_color)_1769958478589.png";

export default function Login() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-md p-4 relative z-10">
        <Card className="glass-card bg-card/60 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardContent className="pt-12 pb-12 px-8 text-center flex flex-col items-center">
            <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
              <img 
                src={komershLogo} 
                alt="Komersh Logo" 
                className="h-16 w-auto object-contain"
              />
            </div>
            
            <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-muted-foreground mb-8">
              Sign in to manage your e-commerce empire.
            </p>

            <Button 
              onClick={handleLogin}
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 transition-all hover:scale-[1.02]"
            >
              Log In with Replit
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
