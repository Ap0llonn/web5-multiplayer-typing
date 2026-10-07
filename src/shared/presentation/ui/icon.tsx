import type { ComponentProps } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CornerDownLeft,
  Eye,
  Globe,
  Moon,
  Plus,
  Sparkles,
  Sun,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

const icons = {
  arrow: ArrowRight,
  enter: CornerDownLeft,
  plus: Plus,
  eye: Eye,
  people: UsersRound,
  check: Check,
  sun: Sun,
  moon: Moon,
  globe: Globe,
  chevron: ChevronDown,
  user: UserRound,
  spark: Sparkles,
} satisfies Record<string, LucideIcon>;

export function Icon({
  name,
  className = "",
  ...props
}: Omit<ComponentProps<"svg">, "children"> & { name: keyof typeof icons }) {
  const LibraryIcon = icons[name];
  return (
    <LibraryIcon
      aria-hidden="true"
      focusable="false"
      className={`h-5 w-5 shrink-0 ${className}`}
      {...props}
    />
  );
}
