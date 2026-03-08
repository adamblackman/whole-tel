'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, Trash2, Loader2, Check, X, AlertTriangle, FileImage } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/browser'
import {
  getSignedUploadUrl,
  savePhotoRecord,
  deletePhoto,
} from '@/lib/actions/photos'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const PHOTO_WARNING_THRESHOLD = 30

type FileStatus = 'pending' | 'uploading' | 'done' | 'error'

interface UploadItem {
  file: File
  status: FileStatus
  error?: string
}

interface PhotoUploaderProps {
  propertyId: string
  photos: Array<{
    id: string
    storage_path: string
    display_order: number
    section: string | null
  }>
  activeSection?: string | null
  /** When false, only renders the upload button and progress -- no photo grid (used when PhotoManager provides its own DnD grid) */
  showGrid?: boolean
}

/**
 * Client Component for batch uploading, displaying, and deleting property photos.
 *
 * Upload flow (two-step signed URL pattern -- never routes file through Server Action body):
 * 1. User selects one or more files via hidden <input type="file" multiple>
 * 2. Files upload sequentially: signed URL -> browser upload -> save record
 * 3. Inline progress list shows per-file status during batch upload
 */
export default function PhotoUploader({ propertyId, photos, activeSection, showGrid = true }: PhotoUploaderProps) {
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isUploading = uploadQueue.some(item => item.status === 'uploading' || item.status === 'pending')

  function getPublicUrl(storagePath: string): string {
    const supabase = createClient()
    const { data } = supabase.storage
      .from('property-photos')
      .getPublicUrl(storagePath)
    return data.publicUrl
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    setError(null)

    // Validate file sizes before starting any uploads
    const files = Array.from(fileList)
    const oversized = files.filter(f => f.size > MAX_FILE_SIZE)
    if (oversized.length > 0) {
      const names = oversized.map(f => f.name).join(', ')
      setError(`Files over 10MB rejected: ${names}`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Build upload queue
    const items: UploadItem[] = files.map(f => ({ file: f, status: 'pending' as FileStatus }))
    setUploadQueue(items)

    // Sequential upload loop (functional updater to avoid stale state)
    for (let i = 0; i < items.length; i++) {
      setUploadQueue(prev => prev.map((item, idx) =>
        idx === i ? { ...item, status: 'uploading' } : item
      ))

      try {
        // Step 1: Get signed URL from server
        const result = await getSignedUploadUrl(propertyId)
        if ('error' in result) throw new Error(result.error)

        // Step 2: Upload directly from browser to Supabase Storage
        const supabase = createClient()
        const { error: uploadError } = await supabase.storage
          .from('property-photos')
          .uploadToSignedUrl(result.path, result.token, items[i].file)
        if (uploadError) throw uploadError

        // Step 3: Save the photo record with section assignment
        const saveResult = await savePhotoRecord(propertyId, result.path, activeSection)
        if (saveResult.error) throw new Error(saveResult.error)

        setUploadQueue(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'done' } : item
        ))
      } catch (err) {
        setUploadQueue(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' } : item
        ))
      }
    }

    // Reset file input so the same files can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''

    // Clear completed items after a delay
    setTimeout(() => {
      setUploadQueue(prev => {
        const hasActive = prev.some(item => item.status === 'uploading' || item.status === 'pending')
        if (hasActive) return prev
        // Keep only errors visible
        return prev.filter(item => item.status === 'error')
      })
    }, 2000)
  }

  async function handleDelete(photoId: string, storagePath: string) {
    setError(null)
    try {
      const result = await deletePhoto(photoId, propertyId, storagePath)
      if (result.error) throw new Error(result.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  function truncateFilename(name: string, maxLen = 24): string {
    if (name.length <= maxLen) return name
    const ext = name.lastIndexOf('.') > 0 ? name.slice(name.lastIndexOf('.')) : ''
    return name.slice(0, maxLen - ext.length - 3) + '...' + ext
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Photos</h3>

        {/* Hidden file input -- accepts multiple files */}
        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          onChange={handleFilesSelected}
          className="hidden"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Photo
            </>
          )}
        </Button>
      </div>

      {/* Photo count warning */}
      {photos.length >= PHOTO_WARNING_THRESHOLD && (
        <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>This property has {photos.length} photos. Consider removing unused ones for a cleaner gallery.</span>
        </div>
      )}

      {/* Error display */}
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}

      {/* Upload progress list */}
      {uploadQueue.length > 0 && (
        <div className="mt-3 rounded-lg border bg-muted/30 p-3 space-y-1.5">
          {uploadQueue.map((item, idx) => (
            <div
              key={`${item.file.name}-${idx}`}
              className={`flex items-center gap-3 text-sm px-2 py-1.5 rounded-md transition-opacity duration-500 ${
                item.status === 'done' ? 'opacity-60' : 'opacity-100'
              }`}
            >
              <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate flex-1 font-medium">
                {truncateFilename(item.file.name)}
              </span>
              {item.status === 'pending' && (
                <span className="text-muted-foreground text-xs">Waiting</span>
              )}
              {item.status === 'uploading' && (
                <Loader2 className="h-4 w-4 animate-spin text-brand-teal" />
              )}
              {item.status === 'done' && (
                <Check className="h-4 w-4 text-green-600" />
              )}
              {item.status === 'error' && (
                <div className="flex items-center gap-1 text-destructive">
                  <X className="h-4 w-4" />
                  <span className="text-xs">{item.error}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo grid (hidden when PhotoManager provides its own DnD grid) */}
      {showGrid && (
        photos.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-4">
            No photos yet. Upload your first photo.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative aspect-video rounded-lg overflow-hidden">
                <Image
                  src={getPublicUrl(photo.storage_path)}
                  alt="Property photo"
                  fill
                  className="object-cover rounded-lg"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
                <button
                  onClick={() => handleDelete(photo.id, photo.storage_path)}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/50 text-white hover:bg-destructive transition-colors"
                  aria-label="Delete photo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
