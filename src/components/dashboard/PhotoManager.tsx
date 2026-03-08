'use client'

import { useState, useCallback } from 'react'
import { move } from '@dnd-kit/helpers'
import { DndProvider } from '@/components/dashboard/DndProvider'
import { SortablePhoto } from '@/components/dashboard/SortablePhoto'
import { SectionManager } from '@/components/dashboard/SectionManager'
import PhotoUploader from '@/components/dashboard/PhotoUploader'
import { reorderPhotos } from '@/lib/actions/photos'

interface Photo {
  id: string
  storage_path: string
  display_order: number
  section: string | null
}

interface PhotoManagerProps {
  propertyId: string
  photos: Photo[]
}

/**
 * Client component that composes DndProvider, SectionManager, SortablePhoto,
 * and PhotoUploader into the full photo management experience.
 * Manages active section state and handles drag-to-reorder.
 */
export function PhotoManager({ propertyId, photos: initialPhotos }: PhotoManagerProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  // Track sections that have been added via SectionManager (even if no photos assigned yet)
  const photosWithSections = initialPhotos.filter((p) => p.section != null)
  const photoSections = [...new Set(photosWithSections.map((p) => p.section as string))]
  const [addedSections, setAddedSections] = useState<string[]>([])

  // Combine photo-derived sections with manually added ones
  const allSections = [...new Set([...photoSections, ...addedSections])]

  // Local photo order for optimistic drag feedback
  const [localPhotos, setLocalPhotos] = useState<Photo[]>(initialPhotos)

  // Sync when server data changes (photos prop changes on revalidation)
  // Using a simple key comparison to detect server updates
  const serverPhotoIds = initialPhotos.map((p) => p.id).join(',')
  const [lastServerIds, setLastServerIds] = useState(serverPhotoIds)
  if (serverPhotoIds !== lastServerIds) {
    setLocalPhotos(initialPhotos)
    setLastServerIds(serverPhotoIds)
    // Recalculate added sections: keep only those not in new photo sections
    const newPhotoSections = [...new Set(initialPhotos.filter((p) => p.section != null).map((p) => p.section as string))]
    setAddedSections((prev) => prev.filter((s) => !newPhotoSections.includes(s)))
  }

  // Filter photos for display
  const displayPhotos =
    activeSection === null
      ? localPhotos
      : localPhotos.filter(
          (p) =>
            (activeSection === 'General' && p.section == null) ||
            p.section === activeSection
        )

  // Group photos by section for "All" view
  const groupedSections = activeSection === null ? getGroupedSections(localPhotos, allSections) : null

  const handleDragEnd = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: any) => {
      const { source, target } = event.operation
      if (!source || !target) return

      // Use move helper to reorder the local state
      const currentIds = displayPhotos.map((p) => ({ id: p.id }))
      const newOrder = move(currentIds, event)
      const newOrderIds = newOrder.map((item) => item.id as string)

      // Optimistically reorder local state
      const photoMap = new Map(localPhotos.map((p) => [p.id, p]))
      const reorderedDisplay = newOrderIds
        .map((id) => photoMap.get(id))
        .filter(Boolean) as Photo[]

      if (activeSection === null) {
        // Reorder all photos globally
        setLocalPhotos(reorderedDisplay.map((p, i) => ({ ...p, display_order: i })))
        reorderPhotos(propertyId, newOrderIds)
      } else {
        // Reorder within section, keep other photos in place
        const otherPhotos = localPhotos.filter(
          (p) =>
            !(
              (activeSection === 'General' && p.section == null) ||
              p.section === activeSection
            )
        )
        const merged = [...otherPhotos, ...reorderedDisplay].sort(
          (a, b) => a.display_order - b.display_order
        )
        // Re-number globally
        const renumbered = merged.map((p, i) => ({ ...p, display_order: i }))
        setLocalPhotos(renumbered)
        reorderPhotos(
          propertyId,
          renumbered.map((p) => p.id)
        )
      }
    },
    [displayPhotos, localPhotos, activeSection, propertyId]
  )

  function handleSectionAdd(section: string) {
    setAddedSections((prev) =>
      prev.includes(section) ? prev : [...prev, section]
    )
  }

  return (
    <div className="space-y-4">
      <SectionManager
        propertyId={propertyId}
        existingSections={allSections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onSectionAdd={handleSectionAdd}
      />

      <PhotoUploader
        propertyId={propertyId}
        photos={initialPhotos}
        activeSection={activeSection}
        showGrid={false}
      />

      {/* Photo grid with DnD */}
      {displayPhotos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No photos in this section.
        </p>
      ) : groupedSections ? (
        /* "All" view: grouped by section with headers */
        <DndProvider onDragEnd={handleDragEnd}>
          <div className="space-y-6">
            {groupedSections.map(({ section, photos: sectionPhotos }) => (
              <div key={section}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {section}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {sectionPhotos.map((photo, index) => (
                    <SortablePhoto
                      key={photo.id}
                      photo={photo}
                      index={index}
                      section={photo.section}
                      sections={allSections}
                      propertyId={propertyId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DndProvider>
      ) : (
        /* Filtered view: single section */
        <DndProvider onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {displayPhotos.map((photo, index) => (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                index={index}
                section={photo.section}
                sections={allSections}
                propertyId={propertyId}
              />
            ))}
          </div>
        </DndProvider>
      )}
    </div>
  )
}

/** Group photos by section for the "All" view */
function getGroupedSections(
  photos: Photo[],
  sections: string[]
): { section: string; photos: Photo[] }[] {
  const PRESET_ORDER = ['Rooms', 'Common Area', 'Pool', 'Exterior']

  // General = photos with null section
  const generalPhotos = photos.filter((p) => p.section == null)

  // Group by known sections
  const groups: { section: string; photos: Photo[] }[] = []

  // Presets first, then custom, in the order they appear in sections array
  const orderedSections = [
    ...PRESET_ORDER.filter((p) => sections.includes(p)),
    ...sections.filter((s) => !PRESET_ORDER.includes(s)),
  ]

  for (const section of orderedSections) {
    const sectionPhotos = photos
      .filter((p) => p.section === section)
      .sort((a, b) => a.display_order - b.display_order)
    if (sectionPhotos.length > 0) {
      groups.push({ section, photos: sectionPhotos })
    }
  }

  // General goes last (or first if only section)
  if (generalPhotos.length > 0) {
    groups.unshift({
      section: 'General',
      photos: generalPhotos.sort((a, b) => a.display_order - b.display_order),
    })
  }

  return groups
}
