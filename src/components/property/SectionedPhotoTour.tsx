'use client'

import { useMemo, useCallback } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import type { Plugin } from 'yet-another-react-lightbox'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import {
  createModule,
  useLightboxState,
  useLightboxDispatch,
} from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'

interface SectionPhoto {
  id: string
  url: string
  alt: string
  section: string | null
}

interface SectionedPhotoTourProps {
  photos: SectionPhoto[]
  open: boolean
  onClose: () => void
  initialIndex?: number
}

/** Preset section display order */
const PRESET_ORDER = ['Rooms', 'Common Area', 'Pool', 'Exterior']

function getSectionDisplayOrder(sectionName: string): number {
  const idx = PRESET_ORDER.indexOf(sectionName)
  if (idx !== -1) return idx
  if (sectionName === 'General') return 9999
  return 1000
}

function groupAndOrderPhotos(photos: SectionPhoto[]) {
  const groups = new Map<string, SectionPhoto[]>()
  for (const photo of photos) {
    const section = photo.section ?? 'General'
    const existing = groups.get(section) ?? []
    existing.push(photo)
    groups.set(section, existing)
  }

  const sortedSections = [...groups.keys()].sort((a, b) => {
    const orderA = getSectionDisplayOrder(a)
    const orderB = getSectionDisplayOrder(b)
    if (orderA !== orderB) return orderA - orderB
    return a.localeCompare(b)
  })

  const orderedPhotos: SectionPhoto[] = []
  const sectionStartIndices: { name: string; startIndex: number }[] = []

  for (const section of sortedSections) {
    sectionStartIndices.push({ name: section, startIndex: orderedPhotos.length })
    const sectionPhotos = groups.get(section) ?? []
    orderedPhotos.push(...sectionPhotos)
  }

  return { orderedPhotos, sectionStartIndices }
}

// Shared ref to pass section data into the YARL module component
// (YARL modules are instantiated by the plugin system, so we use a ref for data flow)
let _sectionsRef: { name: string; startIndex: number }[] = []

/** Section tabs component rendered inside YARL lightbox */
function SectionTabsComponent() {
  const sections = _sectionsRef
  const { currentIndex, slides } = useLightboxState()
  const dispatch = useLightboxDispatch()

  const activeSection = useMemo(() => {
    let active = sections[0]?.name ?? ''
    for (const section of sections) {
      if (section.startIndex <= currentIndex) {
        active = section.name
      }
    }
    return active
  }, [sections, currentIndex])

  const handleTabClick = useCallback(
    (startIndex: number) => {
      dispatch({
        type: 'update',
        slides: [...slides],
        index: startIndex,
      })
    },
    [dispatch, slides]
  )

  if (sections.length <= 1) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          maxWidth: '100%',
          padding: '0 8px',
        }}
      >
        {sections.map((section) => {
          const isActive = section.name === activeSection
          return (
            <button
              key={section.name}
              onClick={() => handleTabClick(section.startIndex)}
              style={{
                flexShrink: 0,
                borderRadius: '9999px',
                padding: '6px 16px',
                fontSize: '14px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 200ms ease',
                background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
                color: isActive ? '#111827' : 'rgba(255, 255, 255, 0.8)',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
                  e.currentTarget.style.color = '#ffffff'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
                }
              }}
            >
              {section.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const sectionTabsModule = createModule('SectionTabs', SectionTabsComponent)

/** Plugin that injects section tabs into the lightbox controller */
const SectionTabsPlugin: Plugin = ({ addChild }) => {
  addChild('controller', sectionTabsModule)
}

export function SectionedPhotoTour({
  photos,
  open,
  onClose,
  initialIndex = 0,
}: SectionedPhotoTourProps) {
  const { orderedPhotos, sectionStartIndices } = useMemo(
    () => groupAndOrderPhotos(photos),
    [photos]
  )

  // Update the shared ref so the module component can read section data
  _sectionsRef = sectionStartIndices

  const slides = useMemo(
    () =>
      orderedPhotos.map((p) => ({
        src: p.url,
        alt: p.alt,
      })),
    [orderedPhotos]
  )

  if (photos.length === 0) return null

  return (
    <Lightbox
      open={open}
      close={onClose}
      slides={slides}
      index={initialIndex}
      plugins={[Counter, Thumbnails, SectionTabsPlugin]}
      counter={{ container: { style: { bottom: 16, top: 'unset', left: 16 } } }}
      thumbnails={{
        position: 'bottom',
        width: 80,
        height: 60,
        gap: 8,
        border: 0,
        borderRadius: 6,
        padding: 0,
      }}
      carousel={{
        finite: false,
      }}
      animation={{
        swipe: 250,
        navigation: 250,
      }}
      styles={{
        container: { backgroundColor: 'rgba(0, 0, 0, 0.95)' },
      }}
      controller={{
        closeOnBackdropClick: true,
      }}
    />
  )
}
