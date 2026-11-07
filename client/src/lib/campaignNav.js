import { Boxes, Truck, Users, Wallet } from "lucide-react";

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
  {
    key: "fleet",
    label: "GPS Fleet Tracking Solutions",
    shortName: "GPS Fleet",
    href: "/dashboard/submit/fleet",
    icon: Truck,
    description: "BuyerZone Scout form · Embed ID 20038",
    delivery: "scout", // client's BuyerZone Scout form, no SelectHub relay
    enabled: false, // visible but not clickable yet; set to true to launch
  },
  {
    key: "payroll",
    label: "Payroll Services",
    shortName: "Payroll",
    href: "/dashboard/submit/payroll",
    icon: Wallet,
    description: "BuyerZone Scout form · Embed ID 20054",
    delivery: "scout", // client's BuyerZone Scout form, no SelectHub relay
    enabled: false, // visible but not clickable yet; set to true to launch
  },
];

export const DEFAULT_CAMPAIGN_HREF = CAMPAIGN_NAV.find((c) => c.enabled).href;
