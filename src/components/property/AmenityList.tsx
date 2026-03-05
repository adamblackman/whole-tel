import type { LucideIcon } from 'lucide-react'
import {
  Waves,
  Flame,
  Wifi,
  Tv,
  WashingMachine,
  SquareParking,
  Utensils,
  ShowerHead,
  Dumbbell,
  Snowflake,
  Check,
} from 'lucide-react'

const AMENITY_ICONS: Record<string, LucideIcon> = {
  // Pool
  'Infinity pool': Waves,
  'Private pool': Waves,
  'Waterfront pool': Waves,
  'Pool': Waves,
  // Hot tub
  'Hot tub': ShowerHead,
  'Jacuzzi': ShowerHead,
  // BBQ
  'BBQ grill': Flame,
  'BBQ': Flame,
  // WiFi
  'WiFi': Wifi,
  'Wi-Fi': Wifi,
  // TV
  'Smart TV': Tv,
  'Smart TVs (all rooms)': Tv,
  'TV': Tv,
  // Washer
  'Washer/dryer': WashingMachine,
  // Parking
  'Parking': SquareParking,
  'Parking (4 cars)': SquareParking,
  'Private parking': SquareParking,
  // Kitchen
  'Full kitchen': Utensils,
  'Kitchen': Utensils,
  'Gourmet kitchen': Utensils,
  // Gym
  'Gym': Dumbbell,
  'Home gym': Dumbbell,
  // AC
  'A/C': Snowflake,
  'Air conditioning': Snowflake,
  'Central A/C': Snowflake,
}

export function AmenityList({ amenities }: { amenities: string[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {amenities.map((amenity) => {
        const Icon = AMENITY_ICONS[amenity] ?? Check
        return (
          <div key={amenity} className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-brand-teal shrink-0" />
            <span className="text-sm text-foreground">{amenity}</span>
          </div>
        )
      })}
    </div>
  )
}
