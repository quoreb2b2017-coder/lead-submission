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
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    source: { type: String, trim: true, default: "website" },
    message: { type: String, trim: true },
    status: { type: String, enum: LEAD_STATUSES, default: "new" },

    // Lead-submission (relay) fields
    campaign: { type: String, trim: true, index: true },
    formData: { type: mongoose.Schema.Types.Mixed },
    relay: { type: relaySchema, default: undefined },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);
