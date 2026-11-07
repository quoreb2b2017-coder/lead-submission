import { Lock } from "lucide-react";
import Logo from "@/components/ui/Logo";

/** Top bar for signed-out pages (login). The dashboard Topbar needs a signed-in user. */
export default function PublicNavbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between px-4 sm:px-5 xl:px-7">
        <Logo />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
          <Lock className="h-3.5 w-3.5 text-slate-400" /> Secure admin sign-in
        </span>
      </div>
    </header>
  );
}
