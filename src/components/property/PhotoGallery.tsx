'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Camera } from 'lucide-react'
import { SectionedPhotoTour } from './SectionedPhotoTour'

interface Photo {
  id: string
  url: string
  alt: string
  section: string | null
}

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [tourOpen, setTourOpen] = useState(false)
  const [tourIndex, setTourIndex] = useState(0)

  if (photos.length === 0) {
    return (
      <div className="h-64 rounded-xl bg-gradient-to-br from-brand-sand to-brand-teal/20 flex items-center justify-center">
        <p className="text-muted-foreground text-lg font-medium">No photos yet</p>
      </div>
    )
  }

  const displayPhotos = photos.slice(0, 5)

  function openTour(index: number) {
    setTourIndex(index)
    setTourOpen(true)
  }

  return (
    <>
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-64 md:h-[480px] rounded-xl overflow-hidden">
          {displayPhotos.map((photo, idx) => {
            const isHero = idx === 0

            return (
              <button
                key={photo.id}
                onClick={() => openTour(idx)}
                className={`group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 ${
                  isHero ? 'md:col-span-2 md:row-span-2' : ''
                }`}
              >
                <Image
                  src={photo.url}
                  alt={photo.alt}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes={isHero ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 100vw'}
                />
              </button>
            )
          })}
        </div>

        {/* Show all photos button -- Airbnb-style overlay in bottom-right */}
        {photos.length > 5 && (
          <button
            onClick={() => openTour(0)}
            className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg bg-white/90 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg transition-all duration-200 hover:bg-white hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2"
          >
            <Camera className="h-4 w-4" />
            Show all {photos.length} photos
          </button>
        )}
      </div>

      <SectionedPhotoTour
        photos={photos}
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        initialIndex={tourIndex}
      />
    </>
  )
}
