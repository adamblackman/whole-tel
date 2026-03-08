'use client'

import { useSortable } from '@dnd-kit/react/sortable'
import Image from 'next/image'
import { GripVertical, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/browser'
import { deletePhoto, updatePhotoSection } from '@/lib/actions/photos'
import { useState } from 'react'

interface SortablePhotoProps {
  photo: {
    id: string
    storage_path: string
    display_order: number
    section: string | null
  }
  index: number
  section: string | null
  sections: string[]
  propertyId: string
}

function getPublicUrl(storagePath: string): string {
  const supabase = createClient()
  const { data } = supabase.storage
    .from('property-photos')
    .getPublicUrl(storagePath)
  return data.publicUrl
}

/**
 * Draggable photo card with section dropdown and delete button.
 * Uses useSortable from @dnd-kit/react for drag-to-reorder.
 */
export function SortablePhoto({
  photo,
  index,
  section,
  sections,
  propertyId,
}: SortablePhotoProps) {
  const { ref, isDragging } = useSortable({
    id: photo.id,
    index,
    type: 'photo',
    group: section ?? 'general',
  })

  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      const result = await deletePhoto(photo.id, propertyId, photo.storage_path)
      if (result.error) {
        console.error('Delete failed:', result.error)
        setIsDeleting(false)
      }
    } catch {
      setIsDeleting(false)
    }
  }

  async function handleSectionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newSection = e.target.value === '' ? null : e.target.value
    await updatePhotoSection(photo.id, propertyId, newSection)
  }

  return (
    <div
      ref={ref}
      className={`group relative aspect-video rounded-lg overflow-hidden border transition-all ${
        isDragging
          ? 'opacity-50 ring-2 ring-brand-teal scale-[0.98] shadow-lg'
          : 'hover:shadow-md'
      }`}
    >
      <Image
        src={getPublicUrl(photo.storage_path)}
        alt="Property photo"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, 33vw"
        draggable={false}
      />

      {/* Drag handle -- visible on hover */}
      <div className="absolute top-2 left-2 p-1 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Section dropdown */}
      <select
        value={photo.section ?? ''}
        onChange={handleSectionChange}
        className="absolute bottom-2 left-2 text-xs bg-black/60 text-white rounded px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0 outline-none"
        aria-label="Photo section"
      >
        <option value="">General</option>
        {sections.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-black/50 text-white hover:bg-destructive transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
        aria-label="Delete photo"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
