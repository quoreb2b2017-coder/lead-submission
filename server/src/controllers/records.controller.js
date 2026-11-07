import ExcelJS from "exceljs";
import Lead from "../models/Lead.js";
import { CUSTOM_QUESTION, FORM_FIELDS, getCampaign } from "../config/campaigns.js";

const TZ_OFFSET = "+05:30"; // months are counted in India time
const MONTH_RX = /^\d{4}-(0[1-9]|1[0-2])$/;
const STATUS_LABEL = { sent: "Sent", dry_run: "Dry run", failed: "Failed", not_sent: "Not sent" };

const monthRange = (month) => {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { start: new Date(`${month}-01T00:00:00${TZ_OFFSET}`), end: new Date(`${next}-01T00:00:00${TZ_OFFSET}`) };
};

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

/** Sheet columns: meta columns, then every field exactly as posted to the relay. */
export function sheetColumns(campaign) {
  const fieldCodes = [...FORM_FIELDS.map((f) => ({ key: f.code, label: f.label })), { key: CUSTOM_QUESTION.code, label: "Timeframe to decision" }];
  const taken = new Set(fieldCodes.map((c) => c.key));
  const hidden = Object.keys(campaign.hidden)
    .filter((k) => !taken.has(k))
    .map((k) => ({ key: k, label: k, hidden: true }));
  return [
    { key: "_n", label: "#", meta: true },
    { key: "_submittedAt", label: "Submitted at", meta: true },
    { key: "_status", label: "Relay status", meta: true },
    { key: "_by", label: "Submitted by", meta: true },
    ...fieldCodes,
    ...hidden,
  ];
}

const toRows = (leads) =>
  leads.map((l, i) => {
    const p = l.relay?.payload || {};
    return {
      ...p,
      _n: i + 1,
      _id: l._id,
      _submittedAt: fmtDateTime(l.relay?.sentAt || l.createdAt),
      _createdAt: l.createdAt,
      _status: STATUS_LABEL[l.relay?.status] || "Not sent",
      _statusKey: l.relay?.status || "not_sent",
      _by: l.submittedBy?.name || "",
    };
  });

function resolve(req, res) {
  const campaign = getCampaign(req.query.campaign);
  if (!campaign) {
    res.status(404).json({ success: false, message: "Unknown campaign" });
    return null;
  }
  return campaign;
}

/** GET /api/records/summary?campaign=hris&year=2026 → 12 month folders with counts */
export const getYearSummary = async (req, res) => {
  const campaign = resolve(req, res);
  if (!campaign) return;
  const year = Number(req.query.year) || new Date().getFullYear();
  if (year < 2000 || year > 2100) return res.status(400).json({ success: false, message: "Invalid year" });

  const start = new Date(`${year}-01-01T00:00:00${TZ_OFFSET}`);
  const end = new Date(`${year + 1}-01-01T00:00:00${TZ_OFFSET}`);
  const rows = await Lead.aggregate([
    { $match: { campaign: campaign.key, createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { month: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: TZ_OFFSET } }, status: "$relay.status" },
        count: { $sum: 1 },
      },
    },
  ]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    const by = Object.fromEntries(rows.filter((r) => r._id.month === key).map((r) => [r._id.status || "not_sent", r.count]));
    const total = Object.values(by).reduce((a, b) => a + b, 0);
    return { month: key, total, sent: by.sent || 0, dryRun: by.dry_run || 0, failed: by.failed || 0 };
  });

  res.json({
    success: true,
    campaign: { key: campaign.key, name: campaign.name, shortName: campaign.shortName },
    year,
    months,
    totals: months.reduce(
      (t, m) => ({ total: t.total + m.total, sent: t.sent + m.sent, dryRun: t.dryRun + m.dryRun, failed: t.failed + m.failed }),
      { total: 0, sent: 0, dryRun: 0, failed: 0 }
    ),
  });
};

async function monthLeads(campaign, month) {
  const { start, end } = monthRange(month);
  return Lead.find({ campaign: campaign.key, createdAt: { $gte: start, $lt: end } })
    .sort({ createdAt: 1 })
    .populate("submittedBy", "name")
    .lean();
}

/** GET /api/records/month?campaign=hris&month=2026-11 → spreadsheet rows */
export const getMonthSheet = async (req, res) => {
  const campaign = resolve(req, res);
  if (!campaign) return;
  const { month } = req.query;
  if (!MONTH_RX.test(month || "")) return res.status(400).json({ success: false, message: "Month must look like YYYY-MM" });

  const leads = await monthLeads(campaign, month);
  res.json({ success: true, month, columns: sheetColumns(campaign), rows: toRows(leads) });
};

/** GET /api/records/export?campaign=hris&month=2026-11[&status=sent] → .xlsx download */
export const exportMonthSheet = async (req, res) => {
  const campaign = resolve(req, res);
  if (!campaign) return;
  const { month, status } = req.query;
  if (!MONTH_RX.test(month || "")) return res.status(400).json({ success: false, message: "Month must look like YYYY-MM" });

  let leads = await monthLeads(campaign, month);
  if (status && status !== "all") leads = leads.filter((l) => l.relay?.status === status);
  const columns = sheetColumns(campaign);
  const rows = toRows(leads);
  const monthName = new Date(`${month}-01T00:00:00${TZ_OFFSET}`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

  const wb = new ExcelJS.Workbook();
  wb.creator = "LeadHub";
  wb.created = new Date();
  const ws = wb.addWorksheet(`${campaign.shortName} ${month}`, { views: [{ state: "frozen", xSplit: 2, ySplit: 3 }] });

  // Title rows
  ws.mergeCells(1, 1, 1, columns.length);
  ws.getCell(1, 1).value = `${campaign.name} · ${monthName}`;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
  ws.mergeCells(2, 1, 2, columns.length);
  ws.getCell(2, 1).value = `${rows.length} lead${rows.length === 1 ? "" : "s"} · exported ${fmtDateTime(new Date())} IST${status && status !== "all" ? ` · status: ${STATUS_LABEL[status] || status}` : ""}`;
  ws.getCell(2, 1).font = { size: 10, color: { argb: "FF64748B" } };

  // Header
  const header = ws.getRow(3);
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.meta ? c.label : c.key;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.hidden ? "FF475569" : c.meta ? "FF1E293B" : "FF4F46E5" } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF94A3B8" } } };
  });
  header.height = 22;

  rows.forEach((r) => {
    const row = ws.addRow(columns.map((c) => r[c.key] ?? ""));
    row.font = { size: 10 };
    const statusCell = row.getCell(3);
    const colors = { sent: "FF047857", dry_run: "FFB45309", failed: "FFB91C1C" };
    if (colors[r._statusKey]) statusCell.font = { size: 10, bold: true, color: { argb: colors[r._statusKey] } };
  });

  columns.forEach((c, i) => {
    const values = [c.meta ? c.label : c.key, ...rows.map((r) => String(r[c.key] ?? ""))];
    ws.getColumn(i + 1).width = Math.min(48, Math.max(c.key === "_n" ? 5 : 10, ...values.map((v) => v.length + 2)));
  });
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + rows.length, column: columns.length } };

  const filename = `${campaign.shortName}-leads-${month}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
};
