import DashboardShell from "@/components/dashboard/DashboardShell";

// The shell gates content behind a client-side auth check, so the page segment isn't
// rendered during instant-navigation validation. Opt this segment out of that check.
export const instant = false;

export default function DashboardLayout({ children }) {
  return <DashboardShell>{children}</DashboardShell>;
}
