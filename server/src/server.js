import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";

process.on("unhandledRejection", (reason) => console.error("[process] Unhandled promise rejection:", reason));
process.on("uncaughtException", (err) => {
  console.error("[process] Uncaught exception:", err);
  process.exit(1); // let the platform (App Runner / Beanstalk / PM2) restart a clean process
});

async function start() {
  try {
    await connectDB();
    const server = app.listen(env.PORT, env.HOST, () => {
      console.log(`Server listening on ${env.HOST}:${env.PORT} (${env.NODE_ENV}) · relay mode: ${env.RELAY_MODE}`);
    });

    // AWS load balancers keep idle connections open for 60s. Node must keep them longer,
    // otherwise the LB reuses a socket Node already closed and returns intermittent 502s.
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;

    let shuttingDown = false;
    const shutdown = (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`${signal} received, draining connections...`);
      const force = setTimeout(() => {
        console.error("Forced shutdown after 10s");
        process.exit(1);
      }, 10_000);
      force.unref();
      server.close(async () => {
        await disconnectDB().catch(() => {});
        process.exit(0);
      });
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM")); // sent by AWS when stopping/replacing an instance
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
