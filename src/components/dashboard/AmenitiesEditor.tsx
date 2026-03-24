'use client'

import { useState, useTransition } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { upsertPropertyAmenities } from '@/lib/actions/amenities'

export type AmenityCatalogRow = {
  id: string
  name: string
  category: string
  icon_name: string
  display_order: number
}

interface AmenitiesEditorProps {
  catalog: AmenityCatalogRow[]
  selectedIds: string[]
  propertyId: string
}

const CATEGORIES = ['Water', 'Social', 'Work/Event', 'Culinary', 'Wellness'] as const

export function AmenitiesEditor({ catalog, selectedIds, propertyId }: AmenitiesEditorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds))
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await upsertPropertyAmenities(propertyId, [...selected])
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  // Group catalog by category, preserving CATEGORIES order
  const grouped = CATEGORIES.reduce<Record<string, AmenityCatalogRow[]>>((acc, cat) => {
    acc[cat] = catalog.filter((a) => a.category === cat)
    return acc
  }, {} as Record<string, AmenityCatalogRow[]>)

  return (
    <section className="space-y-5">
      <Separator />
      <h2 className="text-lg font-semibold">Amenities</h2>

      {CATEGORIES.map((category) => {
        const items = grouped[category]
        if (!items || items.length === 0) return null
        return (
          <div key={category} className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-2">{category}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items.map((amenity) => (
                <label
                  key={amenity.id}
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <Checkbox
                    checked={selected.has(amenity.id)}
                    onCheckedChange={() => toggle(amenity.id)}
                  />
                  <span className="text-sm">{amenity.name}</span>
                </label>
              ))}
            </div>
          </div>
        )
      })}

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Amenities'}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </section>
  )
}
