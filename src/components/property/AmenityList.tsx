import type { AmenityRow } from './amenity-icons'
import { getIcon } from './amenity-icons'
import { AmenitiesModal } from './AmenitiesModal'

export type { AmenityRow }

const TOP_N = 8

/**
 * Server Component — renders top 8 amenities in a grid with icons from the
 * property_amenities join table. Shows a "See all" modal trigger when there
 * are more than TOP_N amenities.
 */
export function AmenityList({ amenityRows }: { amenityRows: AmenityRow[] }) {
  if (amenityRows.length === 0) return null

  const sorted = [...amenityRows].sort(
    (a, b) => a.amenities.display_order - b.amenities.display_order
  )
  const topRows = sorted.slice(0, TOP_N)

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {topRows.map((row) => {
          const Icon = getIcon(row.amenities.icon_name)
          return (
            <div key={row.amenity_id} className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-brand-teal shrink-0" />
              <span className="text-sm text-foreground">{row.amenities.name}</span>
            </div>
          )
        })}
      </div>
      {amenityRows.length > TOP_N && (
        <AmenitiesModal amenityRows={sorted} totalCount={amenityRows.length} />
      )}
    </div>
  )
}
