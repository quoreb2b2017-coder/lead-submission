import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  const token =
    req.cookies?.[env.COOKIE_NAME] ||
    (header?.startsWith("Bearer ") ? header.slice(7) : null);

  if (!token) return res.status(401).json({ success: false, message: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: "User not found" });
    req.user = user;
    req.sessionId = decoded.sid; // LoginEvent id of this sign-in (tokens issued before sessions existed have none)
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
