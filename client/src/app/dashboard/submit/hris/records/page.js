import RecordsView from "@/views/RecordsView";

// Client-rendered behind an auth check; opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "HRIS Records · LeadHub" };

export default function Page() {
  return <RecordsView campaignKey="hris" />;
}
