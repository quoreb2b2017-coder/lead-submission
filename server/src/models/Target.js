import mongoose from "mongoose";

/** Monthly lead target for one campaign. month is "YYYY-MM" (India time). */
const targetSchema = new mongoose.Schema(
  {
    campaign: { type: String, required: true, trim: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    target: { type: Number, required: true, min: 1, max: 100000 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

targetSchema.index({ campaign: 1, month: 1 }, { unique: true });

export default mongoose.model("Target", targetSchema);
