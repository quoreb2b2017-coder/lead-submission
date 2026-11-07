import ProfileView from "@/views/ProfileView";

// Client-rendered behind an auth check; opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Admin Profile · LeadHub" };

export default function Page() {
  return <ProfileView />;
}
