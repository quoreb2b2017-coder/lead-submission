import mongoose from "mongoose";
import Lead, { LEAD_STATUSES } from "../models/Lead.js";

const DAY = 24 * 60 * 60 * 1000;

export const getLeads = async (req, res) => {
  const { search = "", status, limit = 50 } = req.query;
  const filter = {};
  if (status && LEAD_STATUSES.includes(status)) filter.status = status;
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { email: rx }, { company: rx }];
  }
  const leads = await Lead.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 50, 200));
  res.json({ success: true, leads });
};

export const updateLead = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid lead id" });
  }
  const { status } = req.body || {};
  if (!LEAD_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${LEAD_STATUSES.join(", ")}` });
  }
  const lead = await Lead.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
  if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
  res.json({ success: true, lead });
};

export const deleteLead = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid lead id" });
  }
  const lead = await Lead.findByIdAndDelete(id);
  if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
  res.json({ success: true, message: "Lead deleted" });
};

const pctChange = (current, previous) => {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

export const getLeadStats = async (req, res) => {
  const now = Date.now();
  const days = 30;
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const rangeStart = new Date(startOfToday.getTime() - (days - 1) * DAY);
  const weekAgo = new Date(now - 7 * DAY);
  const twoWeeksAgo = new Date(now - 14 * DAY);

  const [total, thisWeek, lastWeek, convertedThisWeek, convertedLastWeek, byStatus, bySource, daily] =
    await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ createdAt: { $gte: weekAgo } }),
      Lead.countDocuments({ createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } }),
      Lead.countDocuments({ status: "converted", updatedAt: { $gte: weekAgo } }),
      Lead.countDocuments({ status: "converted", updatedAt: { $gte: twoWeeksAgo, $lt: weekAgo } }),
      Lead.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Lead.aggregate([
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+05:30" } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  const statusCounts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]));
  byStatus.forEach(({ _id, count }) => (statusCounts[_id] = count));

  const dailyMap = Object.fromEntries(daily.map((d) => [d._id, d.count]));
  const timeseries = Array.from({ length: days }, (_, i) => {
    const d = new Date(rangeStart.getTime() + i * DAY);
    const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return { date: key, count: dailyMap[key] || 0 };
  });

  const conversionRate = total ? Math.round((statusCounts.converted / total) * 1000) / 10 : 0;
  const active = statusCounts.new + statusCounts.contacted + statusCounts.qualified;

  res.json({
    success: true,
    stats: {
      total,
      thisWeek,
      active,
      conversionRate,
      trends: {
        thisWeek: pctChange(thisWeek, lastWeek),
        converted: pctChange(convertedThisWeek, convertedLastWeek),
      },
      byStatus: statusCounts,
      bySource: bySource.map(({ _id, count }) => ({ source: _id || "unknown", count })),
      timeseries,
    },
  });
};
