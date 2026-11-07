import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.connection.on("connected", () => console.log("MongoDB connected"));
mongoose.connection.on("error", (err) => console.error("MongoDB error:", err.message));
mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected"));

export async function connectDB() {
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.DB_NAME,
    serverSelectionTimeoutMS: 10000,
  });
}

export async function disconnectDB() {
  await mongoose.connection.close();
}
