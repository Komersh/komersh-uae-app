import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();

// ✅ مهم جداً مع Railway/Proxy
app.set("trust proxy", 1);

const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// ✅ Sessions (Postgres store) — لازم قبل registerRoutes
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const PgSession = connectPgSimple(session);
const { Pool } = pg;

const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // optional hardening:
  // ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

app.use(
  session({
    name: "komersh.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    // ✅ مهم مع proxy
    proxy: true,

    store: new PgSession({
      pool: sessionPool,
      tableName: "sessions",
      createTableIfMissing: true,
    }),

    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Railway = true
      sameSite: "lax",
      // optional:
      // maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  }),
);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
