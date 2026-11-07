import mongoose from "mongoose";

/** One record per sign-in: device, IP, approximate area and (optionally) exact location. */
const loginEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ip: String,
    userAgent: String,
    device: { label: String, browser: String, os: String, mobile: Boolean },
    // IP-based, approximate (city level at best)
    location: {
      label: String,
      city: String,
      region: String,
      country: String,
      countryCode: String,
      timezone: String,
      lat: Number,
      lng: Number,
      radiusKm: Number,
      private: Boolean,
    },
    // Browser geolocation, only when the admin explicitly shares it
    exactLocation: {
      lat: Number,
      lng: Number,
      accuracyM: Number,
      label: String,
      capturedAt: Date,
    },
    endedAt: Date, // set on sign-out
  },
  { timestamps: true }
);

// Keep 90 days of sign-in history
loginEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model("LoginEvent", loginEventSchema);
