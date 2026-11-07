import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";

const app = express();

// Behind an AWS load balancer (and/or the Vercel rewrite proxy): use X-Forwarded-* for client IP / HTTPS
app.set("trust proxy", env.TRUST_PROXY);

app.use(helmet());
app.use(
  cors({
    // Frontend normally calls through its own /api proxy (same-origin). Direct browser calls are
    // only allowed from the configured frontend URL(s).
    origin: (origin, cb) => cb(null, !origin || env.CLIENT_URLS.includes(origin)),
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());

if (env.NODE_ENV !== "test") {
  app.use(
    morgan(env.IS_PROD ? "combined" : "dev", {
      // load-balancer health checks would flood the logs
      skip: (req) => req.path.startsWith("/api/health"),
    })
  );
}

// Brute-force protection on sign-in
app.use(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.LOGIN_MAX_ATTEMPTS,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { success: false, message: "Too many sign-in attempts. Please wait 15 minutes and try again." },
  })
);

// General safety net for the whole API
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 600,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (req) => req.path.startsWith("/health"),
    message: { success: false, message: "Too many requests. Please slow down." },
  })
);

app.get("/", (req, res) => res.json({ message: "API is running" }));
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
