import Target from "../models/Target.js";
import Lead from "../models/Lead.js";
import { CAMPAIGNS } from "../config/campaigns.js";

const MONTH_RX = /^\d{4}-(0[1-9]|1[0-2])$/;
const TZ_OFFSET = "+05:30"; // months are counted in India time

export const currentMonth = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "year").value}-${parts.find((p) => p.type === "month").value}`;
};

function monthRange(month) {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { start: new Date(`${month}-01T00:00:00${TZ_OFFSET}`), end: new Date(`${next}-01T00:00:00${TZ_OFFSET}`) };
}

function daysLeftInMonth(month) {
  const { end } = monthRange(month);
  const now = new Date();
  if (now >= end) return 0;
  const { start } = monthRange(month);
  const from = now > start ? now : start;
  return Math.max(1, Math.ceil((end - from) / 86400000));
}

async function progressFor(campaign, month) {
  const { start, end } = monthRange(month);
  const [doc, submitted, dryRuns, failed] = await Promise.all([
    Target.findOne({ campaign, month }).populate("updatedBy", "name"),
    // A lead counts toward the target only once it was actually delivered to the client
    Lead.countDocuments({ campaign, "relay.status": "sent", "relay.sentAt": { $gte: start, $lt: end } }),
    Lead.countDocuments({ campaign, "relay.status": "dry_run", createdAt: { $gte: start, $lt: end } }),
    Lead.countDocuments({ campaign, "relay.status": "failed", createdAt: { $gte: start, $lt: end } }),
  ]);

  const target = doc?.target ?? null;
  const pending = target == null ? null : Math.max(0, target - submitted);
  const daysLeft = daysLeftInMonth(month);
  return {
    campaign,
    campaignName: CAMPAIGNS[campaign]?.name,
    month,
    target,
    submitted,
    pending,
    exceededBy: target != null && submitted > target ? submitted - target : 0,
    met: target != null && submitted >= target,
    percent: target ? Math.min(100, Math.round((submitted / target) * 100)) : 0,
    daysLeft,
    perDayNeeded: pending && daysLeft ? Math.ceil(pending / daysLeft) : 0,
    dryRuns,
    failed,
    updatedAt: doc?.updatedAt,
    updatedBy: doc?.updatedBy?.name,
  };
}

export const getTargets = async (req, res) => {
  const month = req.query.month || currentMonth();
  if (!MONTH_RX.test(month)) return res.status(400).json({ success: false, message: "Month must look like YYYY-MM" });

  const keys = req.query.campaign ? [req.query.campaign] : Object.keys(CAMPAIGNS);
  if (keys.some((k) => !CAMPAIGNS[k])) return res.status(404).json({ success: false, message: "Unknown campaign" });

  const targets = await Promise.all(keys.map((k) => progressFor(k, month)));
  res.json({ success: true, month, currentMonth: currentMonth(), targets });
};

export const setTarget = async (req, res) => {
  const { campaign } = req.params;
  if (!CAMPAIGNS[campaign]) return res.status(404).json({ success: false, message: "Unknown campaign" });

  const month = req.body?.month || currentMonth();
  if (!MONTH_RX.test(month)) return res.status(400).json({ success: false, message: "Month must look like YYYY-MM" });

  const target = Number(req.body?.target);
  if (!Number.isInteger(target) || target < 1 || target > 100000) {
    return res.status(400).json({ success: false, message: "Target must be a whole number between 1 and 100,000" });
  }

  await Target.findOneAndUpdate(
    { campaign, month },
    { target, updatedBy: req.user._id },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, message: `Target set to ${target} leads`, target: await progressFor(campaign, month) });
};
