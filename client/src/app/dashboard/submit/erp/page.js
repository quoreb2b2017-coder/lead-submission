import SubmitLeadView from "@/views/SubmitLeadView";

// Client-rendered behind an auth check; opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "ERP BattleCard · Submit Lead · LeadHub" };

export default function Page() {
  return <SubmitLeadView campaignKey="erp" />;
}
