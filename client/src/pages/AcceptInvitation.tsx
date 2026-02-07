import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function AcceptInvitation() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Processing invitation...");

  const token = useMemo(() => {
    const url = new URL(window.location.href);
    return url.searchParams.get("token") || "";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setStatus("error");
        setMessage("Missing token in the invitation link.");
        return;
      }

      try {
        // ✅ Adjust endpoint if yours is different
        await apiRequest("POST", "/api/invitations/accept", { token });

        if (cancelled) return;
        setStatus("success");
        setMessage("Invitation accepted successfully. You can login now.");
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setMessage(e?.message || "Failed to accept invitation.");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>We are verifying your invitation link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {status === "loading" ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : status === "success" ? (
              <CheckCircle className="h-6 w-6" />
            ) : (
              <XCircle className="h-6 w-6" />
            )}
            <div className="text-sm">{message}</div>
          </div>

          {status !== "loading" && (
            <div className="flex gap-2">
              <Button onClick={() => setLocation("/")} variant="outline">
                Go Home
              </Button>
              <Button onClick={() => setLocation("/")} >
                Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
