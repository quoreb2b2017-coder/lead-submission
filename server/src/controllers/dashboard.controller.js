import Lead from "../models/Lead.js";
import Target from "../models/Target.js";
import { CAMPAIGNS, COMPANY_SIZES, CUSTOM_QUESTION } from "../config/campaigns.js";
import { currentMonth } from "./target.controller.js";

const TZ = "+05:30";
const DAY = 86400000;
const STATUSES = ["sent", "dry_run", "failed"];

const istDayKey = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/** Counts per value of a payload field, in a fixed order when `order` is given. */
async function breakdown(match, field, order, limit = 8) {
  const rows = await Lead.aggregate([
    { $match: match },
    { $group: { _id: `$relay.payload.${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const clean = rows.map((r) => ({ label: r._id || "Not provided", count: r.count }));
  if (!order) return clean.slice(0, limit);
  return order.map((label) => ({ label, count: clean.find((r) => r.label === label)?.count || 0 }));
}

/**
 * GET /api/dashboard?campaign=all|hris|erp&days=30
 * Everything is computed from real submissions only (leads that went through a campaign form).
 */
export const getDashboard = async (req, res) => {
  const key = req.query.campaign || "all";
  if (key !== "all" && !CAMPAIGNS[key]) return res.status(404).json({ success: false, message: "Unknown campaign" });
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const campaignKeys = key === "all" ? Object.keys(CAMPAIGNS) : [key];

  const startOfToday = new Date(`${istDayKey(new Date())}T00:00:00${TZ}`);
  const rangeStart = new Date(startOfToday.getTime() - (days - 1) * DAY);
  const prevStart = new Date(rangeStart.getTime() - days * DAY);
  const month = currentMonth();
  const monthStart = new Date(`${month}-01T00:00:00${TZ}`);

  const base = { campaign: { $in: campaignKeys } };
  const inRange = { ...base, createdAt: { $gte: rangeStart } };

  const [statusRows, prevRows, daily, allTime, targets, monthSent, perCampaign, submitters, recent, sizes, timeframes, countries, industries] =
    await Promise.all([
      Lead.aggregate([{ $match: inRange }, { $group: { _id: "$relay.status", count: { $sum: 1 } } }]),
      Lead.aggregate([
        { $match: { ...base, createdAt: { $gte: prevStart, $lt: rangeStart } } },
        { $group: { _id: "$relay.status", count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: inRange },
        {
          $group: {
            _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } }, status: "$relay.status" },
            count: { $sum: 1 },
          },
        },
      ]),
      Lead.countDocuments(base),
      Target.find({ campaign: { $in: campaignKeys }, month }).lean(),
      Lead.aggregate([
        { $match: { ...base, "relay.status": "sent", "relay.sentAt": { $gte: monthStart } } },
        { $group: { _id: "$campaign", count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: inRange },
        { $group: { _id: { campaign: "$campaign", status: "$relay.status" }, count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: inRange },
        { $group: { _id: "$submittedBy", total: { $sum: 1 }, sent: { $sum: { $cond: [{ $eq: ["$relay.status", "sent"] }, 1, 0] } } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      ]),
      Lead.find(base).sort({ createdAt: -1 }).limit(6).populate("submittedBy", "name").lean(),
      breakdown(inRange, "company_size", COMPANY_SIZES),
      breakdown(inRange, CUSTOM_QUESTION.code, CUSTOM_QUESTION.options),
      breakdown(inRange, "country", null, 6),
      breakdown(inRange, "industry", null, 6),
    ]);

  const count = (rows, s) => rows.find((r) => r._id === s)?.count || 0;
  const totals = Object.fromEntries(STATUSES.map((s) => [s, count(statusRows, s)]));
  const total = totals.sent + totals.dry_run + totals.failed;
  const prevTotal = prevRows.reduce((a, r) => a + r.count, 0);
  const prevSent = count(prevRows, "sent");
  const change = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : cur ? 100 : 0);

  const timeseries = Array.from({ length: days }, (_, i) => {
    const date = istDayKey(rangeStart.getTime() + i * DAY + 12 * 3600000);
    const pick = (s) => daily.find((d) => d._id.day === date && d._id.status === s)?.count || 0;
    return { date, sent: pick("sent"), dryRun: pick("dry_run"), failed: pick("failed") };
  });

  const campaigns = campaignKeys.map((k) => {
    const t = targets.find((x) => x.campaign === k)?.target ?? null;
    const sentThisMonth = monthSent.find((m) => m._id === k)?.count || 0;
    const get = (s) => perCampaign.find((p) => p._id.campaign === k && p._id.status === s)?.count || 0;
    return {
      key: k,
      name: CAMPAIGNS[k].name,
      shortName: CAMPAIGNS[k].shortName,
      inRange: { sent: get("sent"), dryRun: get("dry_run"), failed: get("failed") },
      month: { target: t, sent: sentThisMonth, pending: t == null ? null : Math.max(0, t - sentThisMonth), percent: t ? Math.min(100, Math.round((sentThisMonth / t) * 100)) : 0, met: t != null && sentThisMonth >= t },
    };
  });

  const monthTarget = campaigns.reduce((a, c) => a + (c.month.target || 0), 0);
  const monthSentTotal = campaigns.reduce((a, c) => a + c.month.sent, 0);

  res.json({
    success: true,
    campaign: key,
    days,
    month,
    kpis: {
      total,
      totalChange: change(total, prevTotal),
      sent: totals.sent,
      sentChange: change(totals.sent, prevSent),
      dryRun: totals.dry_run,
      failed: totals.failed,
      deliveryRate: totals.sent + totals.failed ? Math.round((totals.sent / (totals.sent + totals.failed)) * 1000) / 10 : null,
      allTime,
      monthTarget: monthTarget || null,
      monthSent: monthSentTotal,
      monthPercent: monthTarget ? Math.min(100, Math.round((monthSentTotal / monthTarget) * 100)) : 0,
    },
    timeseries,
    campaigns,
    breakdowns: { companySize: sizes, timeframe: timeframes, country: countries, industry: industries },
    submitters: submitters.map((s) => ({ name: s.user[0]?.name || "Unknown", total: s.total, sent: s.sent })),
    recent: recent.map((l) => ({
      _id: l._id,
      name: l.name,
      email: l.relay?.payload?.email || l.email,
      company: l.company,
      campaign: l.campaign,
      status: l.relay?.status || "not_sent",
      createdAt: l.createdAt,
      by: l.submittedBy?.name,
    })),
  });
};
