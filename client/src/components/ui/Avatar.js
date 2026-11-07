import { avatarGradient, initials } from "@/lib/leads";

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
  "2xl": "h-24 w-24 text-3xl",
};

export default function Avatar({ name, size = "md", className = "" }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white ${avatarGradient(
        name
      )} ${SIZES[size]} ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
