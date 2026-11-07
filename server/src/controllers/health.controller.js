import mongoose from "mongoose";

const DB_STATES = ["disconnected", "connected", "connecting", "disconnecting"];
const dbState = () => DB_STATES[mongoose.connection.readyState] || "unknown";

/** Liveness: the process is up. Use for the load balancer / App Runner health check. */
export const getHealth = (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    database: dbState(),
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

/** Readiness: the process can serve traffic (database connected). 503 otherwise. */
export const getReadiness = (req, res) => {
  const database = dbState();
  const ready = database === "connected";
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", database });
};
