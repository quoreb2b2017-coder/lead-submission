import mongoose from "mongoose";

export const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "lost"];
export const RELAY_STATUSES = ["not_sent", "dry_run", "sent", "failed"];

const relaySchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ["dry_run", "live"] },
    status: { type: String, enum: RELAY_STATUSES, default: "not_sent" },
    url: String,
    httpStatus: Number,
    response: String,
    error: String,
    payload: { type: mongoose.Schema.Types.Mixed },
    sentAt: Date,
    durationMs: Number,
  },
  { _id: false }
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Scout copies are captured from the client's form, so a field may occasionally be missing
    email: { type: String, required: [function () { return !this.scoutRef; }, "Email is required"], lowercase: true, trim: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    source: { type: String, trim: true, default: "website" },
    message: { type: String, trim: true },
    status: { type: String, enum: LEAD_STATUSES, default: "new" },

    // Lead-submission (relay) fields
    campaign: { type: String, trim: true, index: true },
    scoutRef: { type: String, trim: true }, // one id per Scout submission (copy of a BuyerZone Scout lead)
    formData: { type: mongoose.Schema.Types.Mixed },
    relay: { type: relaySchema, default: undefined },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// One LeadHub copy per Scout submission, even if the page reports it twice
leadSchema.index({ campaign: 1, scoutRef: 1 }, { unique: true, partialFilterExpression: { scoutRef: { $type: "string" } } });

export default mongoose.model("Lead", leadSchema);
