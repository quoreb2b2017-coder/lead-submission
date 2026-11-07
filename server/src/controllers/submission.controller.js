import Lead from "../models/Lead.js";
import {
  CAMPAIGNS,
  COMPANY_SIZES,
  CUSTOM_QUESTION,
  FORM_FIELDS,
  findCompetitor,
  describeCampaign,
  getCampaign,
} from "../config/campaigns.js";
import { sendToRelay } from "../services/relay.service.js";
import { env } from "../config/env.js";

const EMAIL_RX = /^\S+@\S+\.\S+$/;

export const getSubmissionConfig = (req, res) => {
  res.json({
    success: true,
    relay: { mode: env.RELAY_MODE, url: env.RELAY_URL, contentType: env.RELAY_CONTENT_TYPE },
    fields: FORM_FIELDS,
    companySizes: COMPANY_SIZES,
    customQuestion: CUSTOM_QUESTION,
    campaigns: Object.values(CAMPAIGNS).map(describeCampaign),
  });
};

function validate(body) {
  const errors = {};
  const clean = {};

  for (const f of FORM_FIELDS) {
    const value = String(body[f.key] ?? "").trim();
    if (f.required && !value) errors[f.key] = `${f.label} is required`;
    if (value.length > 200) errors[f.key] = `${f.label} is too long`;
    clean[f.key] = value;
  }
  if (clean.email && !EMAIL_RX.test(clean.email)) errors.email = "Enter a valid email address";
  if (clean.companySize && !COMPANY_SIZES.includes(clean.companySize)) errors.companySize = "Choose a company size from the list";
  if (clean.phone && !/^[+\d][\d\s().-]{5,}$/.test(clean.phone)) errors.phone = "Enter a valid phone number";

  const timeframe = String(body[CUSTOM_QUESTION.key] ?? "").trim();
  if (!timeframe) errors[CUSTOM_QUESTION.key] = "Please choose an implementation timeframe";
  else if (!CUSTOM_QUESTION.options.includes(timeframe)) errors[CUSTOM_QUESTION.key] = "Choose a timeframe from the list";
  clean[CUSTOM_QUESTION.key] = timeframe;

  // Keep the email exactly as typed (e.g. roy+BB1@...); only comparisons are case-insensitive
  return { errors, clean };
}

/** Maps our form keys to SelectHub field codes and appends the campaign's hidden fields. */
function buildPayload(campaign, clean) {
  // Hidden fields first, so a blank hidden value (e.g. ERP's timeframe_to_decision: "")
  // can never overwrite what was actually entered in the form.
  const payload = { ...campaign.hidden };
  for (const f of FORM_FIELDS) payload[f.code] = clean[f.key];
  payload[CUSTOM_QUESTION.code] = clean[CUSTOM_QUESTION.key];
  return payload;
}

export const createSubmission = async (req, res) => {
  const campaign = getCampaign(req.params.campaign);
  if (!campaign) return res.status(404).json({ success: false, message: "Unknown campaign" });

  const { errors, clean } = validate(req.body || {});
  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, message: "Please fix the highlighted fields", errors });
  }

  // Competitor suppression: never submit leads from a competitor of this campaign
  const competitor = findCompetitor(campaign, clean);
  if (competitor) {
    const msg = `${competitor.name} is on the ${campaign.shortName} competitor list, so this lead can't be submitted`;
    return res.status(400).json({
      success: false,
      code: "COMPETITOR",
      message: `Blocked: ${competitor.name} is a competitor for the ${campaign.shortName} campaign.`,
      errors: { [competitor.field]: msg },
    });
  }

  // Guard against submitting the same person twice to the same campaign
  if (!req.body?.allowDuplicate) {
    const existing = await Lead.findOne({ email: clean.email.toLowerCase(), campaign: campaign.key, "relay.status": { $in: ["sent", "dry_run"] } })
      .sort({ createdAt: -1 })
      .select("createdAt relay.status");
    if (existing) {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE",
        message: `${clean.email} was already submitted for ${campaign.shortName} on ${existing.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`,
      });
    }
  }

  const payload = buildPayload(campaign, clean);
  const relay = await sendToRelay(payload);

  const lead = await Lead.create({
    name: `${clean.firstName} ${clean.lastName}`.trim(),
    email: clean.email,
    phone: clean.phone,
    company: clean.company,
    source: campaign.leadSource,
    message: `${CUSTOM_QUESTION.label} ${clean[CUSTOM_QUESTION.key]}`,
    campaign: campaign.key,
    formData: clean,
    relay,
    submittedBy: req.user._id,
  });

  const ok = relay.status === "sent" || relay.status === "dry_run";
  res.status(ok ? 201 : 502).json({
    success: ok,
    message:
      relay.status === "sent"
        ? "Lead submitted to the client successfully"
        : relay.status === "dry_run"
          ? "Dry run complete: lead saved, nothing was sent to the client"
          : `Lead saved, but the relay rejected it: ${relay.error}`,
    lead,
  });
};

/** Re-send a lead whose relay attempt failed (or was a dry run). */
export const retrySubmission = async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead?.relay?.payload) return res.status(404).json({ success: false, message: "Submission not found" });
  if (lead.relay.status === "sent") {
    return res.status(400).json({ success: false, message: "This lead was already sent to the client" });
  }
  lead.relay = await sendToRelay(lead.relay.payload);
  await lead.save();
  const ok = lead.relay.status !== "failed";
  res.status(ok ? 200 : 502).json({
    success: ok,
    message: ok ? `Relay status: ${lead.relay.status}` : `Relay failed again: ${lead.relay.error}`,
    lead,
  });
};

export const listSubmissions = async (req, res) => {
  const filter = { campaign: { $exists: true } };
  if (req.query.campaign) filter.campaign = req.query.campaign;
  if (req.query.mine === "1") filter.submittedBy = req.user._id; // only leads submitted by the signed-in admin
  const [submissions, total] = await Promise.all([
    Lead.find(filter)
    .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 20, 100))
      .populate("submittedBy", "name email"),
    Lead.countDocuments(filter),
  ]);
  res.json({ success: true, submissions, total });
};

/**
 * POST /api/submissions/bulk-delete { ids: [] }
 * Removes submissions from LeadHub only. Anything already delivered to the client stays with the client.
 */
export const bulkDeleteSubmissions = async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const valid = ids.filter((id) => /^[a-f0-9]{24}$/i.test(String(id)));
  if (!valid.length) return res.status(400).json({ success: false, message: "Select at least one submission to delete" });
  if (valid.length > 500) return res.status(400).json({ success: false, message: "You can delete up to 500 submissions at a time" });

  const { deletedCount } = await Lead.deleteMany({ _id: { $in: valid }, campaign: { $exists: true } });
  res.json({
    success: true,
    deletedCount,
    message: `${deletedCount} submission${deletedCount === 1 ? "" : "s"} deleted from LeadHub`,
  });
};
