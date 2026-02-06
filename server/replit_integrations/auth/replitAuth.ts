import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";

// ✅ IMPORTANT: use main storage (has getUsers)
import { storage } from "../storage";

const getOidcConfig = memoize(
  async () => {
    // If not running on Replit / no REPL_ID, disable OIDC
    if (!process.env.REPL_ID) {
      return null as any;
    }

    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID,
    );
  },
  () => "default",
  { maxAge: 3600 * 1000 },
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);

  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  const isProd = process.env.NODE_ENV === "production";

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // ✅ for Railway / production
      secure: isProd, // true in prod, false in dev
      // ✅ important for cross-site redirects (OIDC) and many hosted envs
      sameSite: isProd ? "none" : "lax",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

// ✅ Only used for OIDC users (optional)
async function upsertUser(claims: any) {
  // storage.upsertUser exists in many templates, but if your storage
  // doesn't have it, you can remove this safely.
  if (typeof (storage as any).upsertUser !== "function") return;

  await (storage as any).upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback,
  ) => {
    const user: any = {};
    updateUserSession(user, tokens);

    // Optional user upsert
    await upsertUser(tokens.claims());

    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;

    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );

      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // ✅ Replit login (only works if REPL_ID is configured)
  app.get("/api/login", (req, res, next) => {
    if (!config) return res.status(404).send("OIDC not configured");
    ensureStrategy(req.hostname);

    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    if (!config) return res.status(404).send("OIDC not configured");
    ensureStrategy(req.hostname);

    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    if (!config) return res.redirect("/");

    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href,
      );
    });
  });

  /**
   * ✅ IMPORTANT ENDPOINT:
   * Used by frontend to check if user is logged in.
   * Supports:
   * 1) Replit OIDC (req.user.claims.sub)
   * 2) Email/Password sessions (req.session.userId)
   */
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      // 1) OIDC user
      if (req.user?.claims?.sub) {
        return res.json(req.user);
      }

      // 2) Email/Password session user
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
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "Server error" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const user = req.user as any;

  // If using session-based email/password auth
  if (req.session?.userId) return next();

  // If using OIDC auth
  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
