import DashboardView from "@/views/DashboardView";

// Client-rendered behind an auth check; opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Dashboard · LeadHub" };

export default function Page() {
  return <DashboardView />;
}
