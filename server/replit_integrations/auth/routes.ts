import type { Express } from "express";
import { authStorage } from "./storage";
import { storage } from "../../storage";
import { isAuthenticated } from "./replitAuth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      // ✅ Prevent 304 caching issues
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Pragma", "no-cache");

      // Replit-authenticated user
      const replitUserId = req.user?.claims?.sub;
      if (replitUserId) {
        // Prefer authStorage (where Replit users are stored)
        const user = await authStorage.getUser(replitUserId);
        // Return in the same "claims" shape the frontend expects
        return res.json({
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl,
          },
        });
      }

      // Email/password session fallback
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const users = await storage.getUsers();
      const user = users.find((u: any) => u.id === sessionUserId);

      if (!user || user.isActive === false) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      return res.json({
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        },
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
