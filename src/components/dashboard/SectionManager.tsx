'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { deleteSection } from '@/lib/actions/photos'

const PRESET_SECTIONS = ['Rooms', 'Common Area', 'Pool', 'Exterior'] as const

interface SectionManagerProps {
  propertyId: string
  /** All unique sections currently assigned to photos */
  existingSections: string[]
  /** Currently active section filter (null = "All") */
  activeSection: string | null
  /** Callback when active section changes */
  onSectionChange: (section: string | null) => void
  /** Callback when a new section is added (so parent can track it) */
  onSectionAdd: (section: string) => void
  /** Called optimistically when section is deleted; used for immediate UI update */
  onSectionDeleted?: (section: string) => void
}

/**
 * Section CRUD UI with preset quick-add and custom input.
 * Displays sections as horizontal scrollable pill bar.
 */
export function SectionManager({
  propertyId,
  existingSections,
  activeSection,
  onSectionChange,
  onSectionAdd,
  onSectionDeleted,
}: SectionManagerProps) {
  const router = useRouter()
  const [customName, setCustomName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Presets that haven't been added yet
  const availablePresets = PRESET_SECTIONS.filter(
    (preset) => !existingSections.includes(preset)
  )

  // Display order: presets first (in defined order), then custom sections
  const orderedSections = [
    ...PRESET_SECTIONS.filter((p) => existingSections.includes(p)),
    ...existingSections.filter(
      (s) => !(PRESET_SECTIONS as readonly string[]).includes(s)
    ),
  ]

  async function handleDeleteSection(sectionName: string) {
    // Optimistic update: remove from UI immediately
    onSectionDeleted?.(sectionName)
    if (activeSection === sectionName) {
      onSectionChange(null)
    }

    const result = await deleteSection(propertyId, sectionName)
    if (result.error) {
      console.error('Failed to delete section:', result.error)
      router.refresh() // Revert optimistic update by re-fetching server state
    } else {
      router.refresh() // Sync UI with server after successful delete
    }
  }

  function handleAddCustom() {
    const trimmed = customName.trim()
    if (!trimmed) return
    if (existingSections.includes(trimmed)) {
      setCustomName('')
      return
    }
    onSectionAdd(trimmed)
    onSectionChange(trimmed)
    setCustomName('')
    setIsAdding(false)
  }

  function handleAddPreset(preset: string) {
    onSectionAdd(preset)
    onSectionChange(preset)
  }

  return (
    <div className="space-y-3">
      {/* Section pills - horizontal scrollable */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {/* "All" tab */}
        <button
          onClick={() => onSectionChange(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeSection === null
              ? 'bg-brand-teal text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All
        </button>

        {/* Section pills */}
        {orderedSections.map((section) => (
          <div
            key={section}
            className={`shrink-0 flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeSection === section
                ? 'bg-brand-teal text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <button
              onClick={() => onSectionChange(section)}
              className="cursor-pointer"
            >
              {section}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteSection(section)
              }}
              className={`p-0.5 rounded-full transition-colors ${
                activeSection === section
                  ? 'hover:bg-white/20'
                  : 'hover:bg-foreground/10'
              }`}
              aria-label={`Delete ${section} section`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Quick-add presets + custom section input */}
      <div className="flex items-center gap-2 flex-wrap">
        {availablePresets.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">Add:</span>
            {availablePresets.map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleAddPreset(preset)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {preset}
              </Button>
            ))}
          </>
        )}

        {isAdding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleAddCustom()
            }}
            className="flex items-center gap-1.5"
          >
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Section name"
              className="h-7 w-32 text-xs"
              autoFocus
            />
            <Button type="submit" size="sm" className="h-7 text-xs">
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setIsAdding(false)
                setCustomName('')
              }}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Custom
          </Button>
        )}
      </div>
    </div>
  )
}
