/**
 * Lead-submission campaigns.
 *
 * Every campaign shares the same visible form fields (FORM_FIELDS) and the same
 * custom question. Only the hidden fields and the asset shown to the team differ.
 * To add ERP later, add one more entry to CAMPAIGNS with its own `hidden` values.
 */

// Visible form fields: our key -> SelectHub field code (from the production sheet)
export const FORM_FIELDS = [
  { key: "email", code: "email", label: "Email Address", required: true, type: "email" },
  { key: "firstName", code: "first_name", label: "First Name", required: true },
  { key: "lastName", code: "last_name", label: "Last Name", required: true },
  { key: "industry", code: "industry", label: "Industry" },
  { key: "subIndustry", code: "industry_other", label: "Sub Industry" },
  { key: "function", code: "function", label: "Function" },
  { key: "position", code: "title", label: "Position" },
  { key: "company", code: "company_name", label: "Company", required: true },
  { key: "companySize", code: "company_size", label: "Company Size", required: true },
  { key: "address", code: "address", label: "Street Address" },
  { key: "address2", code: "address_2", label: "Address 2" },
  { key: "city", code: "city", label: "City" },
  { key: "state", code: "state", label: "State" },
  { key: "zip", code: "zip", label: "Zip/Postal Code" },
  { key: "country", code: "country", label: "Country", required: true },
  { key: "phone", code: "phone_number", label: "Phone", required: true },
];

// Exact values SelectHub expects for company_size
export const COMPANY_SIZES = [
  "1 - 49",
  "50 - 99",
  "100 - 499",
  "500 - 999",
  "1000 - 4999",
  "5000 - 9999",
  "10000 - 19999",
  "20000+",
];

// Custom question (same for every campaign)
export const CUSTOM_QUESTION = {
  key: "timeframe",
  code: "timeframe_to_decision",
  label: "When is your company planning to implement new software?",
  required: true,
  options: ["0 – 6 months", "7 – 12 months", "More than 12 months", "Not decided yet"],
};

export const CAMPAIGNS = {
  hris: {
    key: "hris",
    name: "HRIS Systems BattleCard",
    shortName: "HRIS",
    category: "HR Management Software",
    leadSource: "HRIS BattleCard",
    // Wording of the client's own thank-you page for this asset (shown as a preview after submit)
    thankYou: {
      title: "Thank You!",
      message: "Download your report below. We will contact you to provide the additional information.",
      reportName: "HRIS Systems BattleCard",
    },
    asset: {
      eyebrow: "Request Your Free Report Now",
      title: "HRIS Systems BattleCard — ADP Workforce Now vs. BambooHR vs. Workday HCM vs. Rippling",
      tagline: "Compare software strengths & weaknesses to find a winning solution for your organization.",
      description:
        "This executive report provides actionable data for HR software features identified as most important by analysts and human resource management professionals.",
      features: [
        "Applicant Tracking and Recruiting",
        "Benefits Management",
        "Employee Onboarding and Administration",
        "Employee Self-Service",
        "Payroll Management",
        "Reporting and Dashboard",
        "Time and Attendance Management",
        "User Ratings",
        "Workforce Management",
        "Trials & Vendor Support",
      ],
      image: "/assets/hris-battlecard-cover.png",
      vendors: ["ADP Workforce Now", "BambooHR", "Workday HCM", "Rippling"],
    },
    // Required unique hidden fields (sent exactly as given in the production sheet)
    hidden: {
      lead_source: "Quore-PPL",
      scorecard_id: "",
      campaign: "asset_request",
      category: "HR Management Software",
      asset_type: "Selection Guide",
      contract_po_number: "Quore-HR-Global",
      campaign_name: "Quore HRIS Systems ADP VS BattleCard 26",
      ip_address: "",
      page_url: "https://get.softwarebattlecard.com/quore-hris-battlecard-adp-vs-bamboohr-vs-workday-vs-rippling/",
      user_journey: "HRIS BattleCard, ADP vs BambooHR vs Workday vs Rippling PPL",
    },
  },
  erp: {
    key: "erp",
    name: "Top 20 ERP Systems BattleCard",
    shortName: "ERP",
    category: "ERP Software",
    leadSource: "ERP BattleCard",
    thankYou: {
      title: "Thank You, Valued Colleague!",
      message: "Your Top 20 ERP Systems BattleCard Report has been sent to your inbox. We will contact you to provide the additional information.",
      reportName: "Top 20 ERP Systems BattleCard Report",
    },
    asset: {
      eyebrow: "Analyst Report · Software BattleCard",
      title: "Top 20 ERP Systems Comparison BattleCard — Oracle ERP vs. Best Alternatives",
      tagline: "Top 20 ERP Systems BattleCard Report",
      description:
        "Comparison report of the top 20 ERP systems, with Oracle ERP benchmarked against its best alternatives. The report is sent to the prospect's inbox after submission.",
      features: [],
      image: null, // cover graphic (1200px) not added yet
      vendors: ["Oracle ERP", "Top 20 ERP alternatives"],
    },
    // Leads from these companies must not be submitted (matched on company name and email domain)
    competitors: [
      "Acumatica",
      "IQMS",
      "Plex",
      "NetSuite",
      "Epicor",
      "Infor",
      "IFS",
      "Sage",
      "Oracle",
      "SAP",
      "Microsoft",
      "SYSPRO",
      "Gartner",
    ],
    // Required unique hidden fields (exactly as provided for the ERP campaign)
    hidden: {
      lead_source: "Quore-PPL",
      category: "ERP Software",
      category_slug: "erp-software",
      survey_slug: "",
      campaign: "free_custom_scorecard",
      campaign_name: "Quore Top 20 ERP Comparison Oracle VS BattleCard 26",
      asset_type: "Analyst Report",
      team: "CM",
      contract_po_number: "Quore-ERP-Global",
      user_journey: "Top 20 ERP Systems Comparison BattleCard, Oracle ERP vs Best ALT PPL",
      page_url: "https://get.softwarebattlecard.com/quore-top-20-erp-systems-comparison-oracle-vs-alt/",
      // listed blank in the hidden fields; the custom-question answer always overrides it
      timeframe_to_decision: "",
    },
  },
};

export const getCampaign = (key) => CAMPAIGNS[key] || null;

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Returns the competitor a lead belongs to, or null.
 * Company: whole-word match (so "SAP SE" matches but "Sapient" doesn't).
 * Email: any domain label equals the competitor (e.g. jane@us.oracle.com).
 */
export function findCompetitor(campaign, { company = "", email = "" }) {
  const list = campaign.competitors || [];
  const labels = (email.split("@")[1] || "").toLowerCase().split(".");
  for (const name of list) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (new RegExp(`\\b${escapeRx(name)}\\b`, "i").test(company)) return { name, field: "company" };
    if (labels.slice(0, -1).includes(slug)) return { name, field: "email" };
  }
  return null;
}

/** Public view of a campaign for the UI (includes hidden values so the team can verify them). */
export const describeCampaign = (c) => ({
  key: c.key,
  name: c.name,
  shortName: c.shortName,
  category: c.category,
  asset: c.asset,
  hidden: c.hidden,
  competitors: c.competitors || [],
  thankYou: c.thankYou || null,
});
