import LeadsView from "@/views/LeadsView";

// Client-rendered behind an auth check; opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Leads · LeadHub" };

export default function Page() {
  return <LeadsView />;
}
