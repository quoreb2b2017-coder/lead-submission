import { redirect } from "next/navigation";
import { DEFAULT_CAMPAIGN_HREF } from "@/lib/campaignNav";

// Redirect-only segment: it never renders UI, so skip instant-navigation validation.
export const instant = false;

// /dashboard/submit has no form of its own: open the first live campaign.
export default function Page() {
  redirect(DEFAULT_CAMPAIGN_HREF);
}
