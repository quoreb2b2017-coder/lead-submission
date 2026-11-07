import SubmitLeadView from "@/views/SubmitLeadView";

// Client-rendered behind an auth check; opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Payroll Services · Submit Lead · LeadHub" };

export default function Page() {
  return <SubmitLeadView campaignKey="payroll" />;
}
