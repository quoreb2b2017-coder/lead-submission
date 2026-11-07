import { Boxes, Users } from "lucide-react";

/**
 * Campaigns shown under "Lead Capture" in the sidebar.
 * Each enabled campaign has its own page at /dashboard/submit/<key>.
 * To launch ERP: add its config on the server, create app/dashboard/submit/erp/page.js
 * and set `enabled: true` here.
 */
export const CAMPAIGN_NAV = [
  {
    key: "hris",
    label: "HRIS BattleCard",
    shortName: "HRIS",
    href: "/dashboard/submit/hris",
    icon: Users,
    description: "ADP vs. BambooHR vs. Workday vs. Rippling",
    enabled: true,
  },
  {
    key: "erp",
    label: "ERP BattleCard",
    shortName: "ERP",
    href: "/dashboard/submit/erp",
    icon: Boxes,
    description: "Top 20 ERP Systems · Oracle vs. alternatives",
    enabled: true,
  },
];

export const DEFAULT_CAMPAIGN_HREF = CAMPAIGN_NAV.find((c) => c.enabled).href;
