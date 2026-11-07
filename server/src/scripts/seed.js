import { connectDB, disconnectDB } from "../config/db.js";
import User from "../models/User.js";
import Lead, { LEAD_STATUSES } from "../models/Lead.js";

const withSampleLeads = process.argv.includes("--sample");

// Never put fake sample leads into a production database
if (withSampleLeads && process.env.NODE_ENV === "production") {
  console.error("Refusing to insert sample leads with NODE_ENV=production. Run \"npm run seed\" to create the admin only.");
  process.exit(1);
}
const SAMPLE_DOMAIN = "@example.com";

// Small deterministic PRNG so sample data is the same on every run
let seedValue = 42;
const rand = () => ((seedValue = (seedValue * 16807) % 2147483647) - 1) / 2147483646;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const FIRST = ["Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Karan", "Neha", "Arjun", "Isha",
  "Rahul", "Pooja", "Aditya", "Kavya", "Siddharth", "Meera", "Nikhil", "Riya", "Varun", "Tanvi"];
const LAST = ["Sharma", "Patel", "Gupta", "Singh", "Rao", "Iyer", "Mehta", "Verma", "Nair", "Kapoor",
  "Joshi", "Reddy", "Malhotra", "Chopra", "Bose"];
const COMPANIES = ["TechNova", "BrightPath", "CloudNine", "PixelCraft", "DataWave", "GreenLeaf",
  "Zenith Labs", "BlueOrbit", "Nimbus Retail", "UrbanNest"];
const SOURCES = [
  ["website", 5], ["google", 4], ["linkedin", 3], ["referral", 2], ["facebook", 2],
];
const STATUS_WEIGHTS = [["new", 5], ["contacted", 4], ["qualified", 3], ["converted", 2], ["lost", 2]];
const MESSAGES = [
  "Interested in a product demo for our sales team.",
  "Looking for pricing details for 50+ users.",
  "Would like to discuss a custom integration.",
  "Need a quote for an annual plan.",
  "Can we schedule a call next week?",
];

const weighted = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of pairs) if ((r -= w) < 0) return value;
  return pairs[0][0];
};

function buildSampleLeads(count = 72, days = 45) {
  return Array.from({ length: count }, (_, i) => {
    const first = pick(FIRST);
    const last = pick(LAST);
    // Bias toward recent days so the trend line rises
    const daysAgo = Math.floor(Math.pow(rand(), 1.4) * days);
    const createdAt = new Date(Date.now() - daysAgo * 86400000 - Math.floor(rand() * 86400000));
    const status = weighted(STATUS_WEIGHTS);
    if (!LEAD_STATUSES.includes(status)) throw new Error(`Bad status ${status}`);
    return {
      name: `${first} ${last}`,
      email: `${first}.${last}${i}${SAMPLE_DOMAIN}`.toLowerCase(),
      phone: `+91 9${String(Math.floor(rand() * 1e9)).padStart(9, "0")}`,
      company: pick(COMPANIES),
      source: weighted(SOURCES),
      status,
      message: pick(MESSAGES),
      createdAt,
      updatedAt: new Date(createdAt.getTime() + Math.floor(rand() * 3 * 86400000)),
    };
  });
}

async function seed() {
  await connectDB();

  const { ADMIN_NAME = "Admin", ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required in .env");

  const admin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (admin) {
    console.log(`Admin already exists: ${admin.email}`);
  } else {
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "admin" });
    console.log(`Admin created: ${ADMIN_EMAIL}`);
  }

  if (withSampleLeads) {
    const { deletedCount } = await Lead.deleteMany({ email: { $regex: `${SAMPLE_DOMAIN.replace(".", "\\.")}$` } });
    if (deletedCount) console.log(`Removed ${deletedCount} old sample leads`);
    const leads = buildSampleLeads();
    await Lead.insertMany(leads, { timestamps: false });
    console.log(`Inserted ${leads.length} sample leads (emails ending in ${SAMPLE_DOMAIN})`);
  }
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
