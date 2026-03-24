import type { LucideIcon } from 'lucide-react'
import {
  Waves,
  Thermometer,
  Sunset,
  Anchor,
  Wind,
  Droplets,
  Building2,
  Gamepad2,
  Tv,
  Music,
  Wine,
  Flame,
  Circle,
  Wifi,
  Monitor,
  Users,
  UtensilsCrossed,
  ChefHat,
  Utensils,
  GlassWater,
  Dumbbell,
  Leaf,
  Heart,
  CloudFog,
  Flower2,
  Check,
} from 'lucide-react'

// Note: Presentation2 is not available in lucide-react; Monitor is used as fallback for presentation screens.
export const ICON_MAP: Record<string, LucideIcon> = {
  Waves,
  Thermometer,
  Sunset,
  Anchor,
  Wind,
  Droplets,
  Building2,
  Gamepad2,
  Tv,
  Music,
  Wine,
  Flame,
  Circle,
  Wifi,
  Monitor,
  Users,
  Presentation2: Monitor,
  UtensilsCrossed,
  ChefHat,
  Utensils,
  GlassWater,
  Dumbbell,
  Leaf,
  Heart,
  CloudFog,
  Flower2,
}

export type AmenityRow = {
  amenity_id: string
  amenities: {
    id: string
    name: string
    category: string
    icon_name: string
    display_order: number
  }
}

export function getIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? Check
}
