import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    // Two-factor authentication (TOTP). Secrets are AES-256-GCM encrypted, recovery codes are hashed,
    // and none of it is ever returned by the API.
    twoFactor: {
      enabled: { type: Boolean, default: false },
      enabledAt: { type: Date },
      secret: { type: String, select: false },
      pendingSecret: { type: String, select: false },
      recoveryCodes: { type: [String], select: false, default: undefined },
      lastStep: { type: Number, select: false }, // last accepted TOTP time step (replay protection)
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    if (ret.twoFactor) ret.twoFactor = { enabled: Boolean(ret.twoFactor.enabled), enabledAt: ret.twoFactor.enabledAt };
    return ret;
  },
});

export default mongoose.model("User", userSchema);
