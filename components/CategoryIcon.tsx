"use client";

import {
  Backpack,
  Briefcase,
  Heartbeat,
  MusicNotes,
  Storefront,
  Tree,
  UsersThree,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";

import type { CategoryId } from "@/lib/events";

export const CATEGORY_ICONS: Record<CategoryId, Icon> = {
  festival: MusicNotes,
  community: UsersThree,
  civic: Tree,
  health: Heartbeat,
  school: Backpack,
  business: Storefront,
  jobs: Briefcase,
};

export function CategoryGlyph({
  id,
  size = 16,
  color = "currentColor",
  weight = "fill",
  className,
}: {
  id: CategoryId;
  size?: number;
  color?: string;
  weight?: IconWeight;
  className?: string;
}) {
  const Glyph = CATEGORY_ICONS[id];
  return <Glyph size={size} color={color} weight={weight} className={className} />;
}
