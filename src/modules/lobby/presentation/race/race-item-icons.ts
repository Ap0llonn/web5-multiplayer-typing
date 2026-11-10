import {
  Radio,
  CloudFog,
  Route,
  Shield,
  Sun,
  Zap,
  Scissors,
  FastForward,
  type LucideIcon,
} from "lucide-react";
import type { RaceItemType } from "../../public";
export const raceItemIcons = {
  shockwave: Radio,
  shortcut: Scissors,
  detour: Route,
  fog: CloudFog,
  shield: Shield,
  clear: Sun,
  nudge: Zap,
  catchup: FastForward,
} satisfies Record<RaceItemType, LucideIcon>;
