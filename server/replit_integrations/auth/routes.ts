import type { Express } from "express";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  /**
   * IMPORTANT:
   * Do NOT define /api/auth/user here.
   * It's already implemented in replitAuth.ts (and it supports BOTH):
   * - Replit OIDC session
   * - Email/password session (req.session.userId)
   */
}
