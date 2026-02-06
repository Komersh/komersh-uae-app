import type { Express } from "express";
import { authStorage } from "./storage";
import { storage } from "../../storage";
import { isAuthenticated } from "./replitAuth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      // منع أي caching (مهم عشان ما يرجع 304 أو بيانات قديمة)
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      // 1) Replit-authenticated user (passport user)
      const replitUserId = req.user?.claims?.sub;
      if (replitUserId) {
        const u = await authStorage.getUser(replitUserId);

        if (!u) return res.status(401).json({ message: "Unauthorized" });

        // نرجّع الشكلين مع بعض عشان أي كود بالفرونت يشتغل
        return res.json({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          profileImageUrl: u.profileImageUrl,
          role: (u as any).role,
          isActive: (u as any).isActive,
          claims: {
            sub: u.id,
            email: u.email,
            first_name: u.firstName,
            last_name: u.lastName,
            profile_image_url: u.profileImageUrl,
          },
        });
      }

      // 2) Email/password session fallback
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const users = await storage.getUsers();
      const u = users.find((x: any) => x.id === sessionUserId);

      if (!u || u.isActive === false) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      return res.json({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        profileImageUrl: u.profileImageUrl,
        role: u.role,
        isActive: u.isActive,
        claims: {
          sub: u.id,
          email: u.email,
          first_name: u.firstName,
          last_name: u.lastName,
          profile_image_url: u.profileImageUrl,
        },
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
