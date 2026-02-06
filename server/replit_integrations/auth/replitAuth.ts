// server/replit_integrations/auth/replitAuth.ts

import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";

import { storage } from "../../storage";
import { authStorage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    if (!process.env.REPL_ID) return null as any;

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
  const PgStore = connectPg(session);

  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: Math.floor(sessionTtl / 1000),
    tableName: "sessions",
  });

  const isProd = process.env.NODE_ENV === "production";

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    proxy: true, // ✅ important behind Railway proxy
    cookie: {
      httpOnly: true,
      secure: isProd, // ✅ required for https
      sameSite: "lax", // ✅ prevents redirect-loop issues
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

async function upsertUser(claims: any) {
  await authStorage.upsertUser({
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

  const verify: VerifyFunction = async (tokens, verified) => {
    const user: any = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // ---- Passport serialize/deserialize
  passport.serializeUser((user: any, cb) => cb(null, user));
  passport.deserializeUser((user: any, cb) => cb(null, user));

  // ---- Dynamic OIDC strategy per hostname
  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (registeredStrategies.has(strategyName)) return;

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
  };

  // ---- Replit OIDC login
  app.get("/api/login", (req, res, next) => {
    if (!process.env.REPL_ID) return res.status(400).send("REPL_ID not set");
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    if (!process.env.REPL_ID) return res.status(400).send("REPL_ID not set");
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      if (!process.env.REPL_ID || !config) return res.redirect("/");
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href,
      );
    });
  });

  // ✅ مهم: سكّر setupAuth هون (القوس كان ناقص عندك)
} // <-- لا تحذف هذا

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Replit-authenticated user
  if (req.isAuthenticated() && user?.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) return next();

    // refresh
    const refreshToken = user.refresh_token;
    if (!refreshToken) return res.status(401).json({ message: "Unauthorized" });

    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      return next();
    } catch {
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  // Email/password session fallback
  const sessionUserId = (req as any).session?.userId;
  if (!sessionUserId) return res.status(401).json({ message: "Unauthorized" });

  return next();
};
