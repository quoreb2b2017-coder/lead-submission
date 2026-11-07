import dotenv from "dotenv";

// Locally values come from server/.env. On AWS they come from the service's environment
// variables / secrets (App Runner, Elastic Beanstalk, ECS or PM2); no .env file is needed there.
dotenv.config({ quiet: true });

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

const fail = (msg) => {
  console.error(`[config] ${msg}`);
  process.exit(1);
};

const missing = ["MONGODB_URI", "JWT_SECRET"].filter((key) => !process.env[key]);
if (missing.length) fail(`Missing required env variables: ${missing.join(", ")}`);

if (isProd) {
  if (process.env.JWT_SECRET.length < 32) fail("JWT_SECRET must be at least 32 characters in production");
  if (/localhost|127\.0\.0\.1/.test(process.env.MONGODB_URI)) {
    console.warn("[config] MONGODB_URI points to a local database. Use MongoDB Atlas (or another hosted MongoDB) on AWS.");
  }
  if (!process.env.CLIENT_URL) console.warn("[config] CLIENT_URL is not set; only same-origin (proxied) requests will work.");
}

// Comma-separated list, e.g. "https://leadhub.vercel.app,https://admin.example.com"
const clientUrls = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);

// How many proxies sit in front of the app (e.g. AWS load balancer = 1, Vercel rewrite + ALB = 2).
const trustProxy = process.env.TRUST_PROXY ?? (isProd ? "1" : "0");

export const env = {
  PORT: Number(process.env.PORT) || 5000,
  HOST: process.env.HOST || "0.0.0.0",
  NODE_ENV,
  IS_PROD: isProd,
  CLIENT_URL: clientUrls[0],
  CLIENT_URLS: clientUrls,
  TRUST_PROXY: /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === "true",
  MONGODB_URI: process.env.MONGODB_URI,
  DB_NAME: process.env.DB_NAME || "lead_submission",
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  COOKIE_NAME: process.env.COOKIE_NAME || "token",
  // Secure (HTTPS-only) auth cookie. Defaults to on in production; set COOKIE_SECURE=false only
  // while the site is served over plain HTTP (e.g. a bare IP before a domain + SSL is set up).
  COOKIE_SECURE: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : isProd,
  // Brute-force protection for /api/auth/login: attempts per IP per 15 minutes
  LOGIN_MAX_ATTEMPTS: Number(process.env.LOGIN_MAX_ATTEMPTS) || 10,
  // Lead relay. Anything other than RELAY_MODE=live is a dry run (nothing is sent).
  RELAY_URL: process.env.RELAY_URL || "https://prod-relay.herokuapp.com/api/relay",
  RELAY_MODE: process.env.RELAY_MODE === "live" ? "live" : "dry_run",
  RELAY_CONTENT_TYPE: process.env.RELAY_CONTENT_TYPE === "json" ? "json" : "form",
  RELAY_TIMEOUT_MS: Number(process.env.RELAY_TIMEOUT_MS) || 15000,
};
