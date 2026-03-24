'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { AmenityRow } from './amenity-icons'
import { getIcon } from './amenity-icons'

const CATEGORY_ORDER = ['Water', 'Social', 'Work/Event', 'Culinary', 'Wellness']

interface AmenitiesModalProps {
  amenityRows: AmenityRow[]
  totalCount: number
}

/**
 * Client Component — Dialog that shows all amenities grouped by category.
 * Triggered from AmenityList when a property has more than TOP_N amenities.
 */
export function AmenitiesModal({ amenityRows, totalCount }: AmenitiesModalProps) {
  // Group amenities by category
  const grouped: Record<string, AmenityRow[]> = {}
  for (const row of amenityRows) {
    const cat = row.amenities.category
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(row)
  }

  // Order categories: known order first, then any unknown categories
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)),
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="mt-3 px-0 text-brand-teal">
          See all {totalCount} amenities
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>All amenities</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          {orderedCategories.map((category) => (
            <div key={category}>
              <p className="text-sm font-medium text-muted-foreground mb-2">{category}</p>
              <div className="grid grid-cols-2 gap-3">
                {grouped[category].map((row) => {
                  const Icon = getIcon(row.amenities.icon_name)
                  return (
                    <div key={row.amenity_id} className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-brand-teal shrink-0" />
                      <span className="text-sm text-foreground">{row.amenities.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
