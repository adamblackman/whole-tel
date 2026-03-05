'use client'

import { useState } from 'react'
import Image from 'next/image'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

interface Photo {
  id: string
  url: string
  alt: string
}

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  if (photos.length === 0) {
    return (
      <div className="h-64 rounded-xl bg-gradient-to-br from-brand-sand to-brand-teal/20 flex items-center justify-center">
        <p className="text-muted-foreground text-lg font-medium">No photos yet</p>
      </div>
    )
  }

  const displayPhotos = photos.slice(0, 5)

  function openLightbox(index: number) {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-64 md:h-[480px] rounded-xl overflow-hidden">
        {displayPhotos.map((photo, idx) => {
          const isHero = idx === 0
          const isLast = idx === 4
          const hasMore = photos.length > 5

          return (
            <button
              key={photo.id}
              onClick={() => openLightbox(idx)}
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
              {isLast && hasMore && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    Show all {photos.length} photos
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={photos.map((p) => ({ src: p.url }))}
        index={lightboxIndex}
      />
    </>
  )
}
