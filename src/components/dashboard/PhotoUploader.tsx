'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/browser'
import {
  getSignedUploadUrl,
  savePhotoRecord,
  deletePhoto,
} from '@/lib/actions/photos'

interface PhotoUploaderProps {
  propertyId: string
  photos: Array<{
    id: string
    storage_path: string
    display_order: number
  }>
}

/**
 * Client Component for uploading, displaying, and deleting property photos.
 *
 * Upload flow (two-step signed URL pattern — never routes file through Server Action body):
 * 1. User selects a file via hidden <input type="file"> (NOT inside a <form>)
 * 2. Server Action getSignedUploadUrl verifies ownership and returns a signed URL + token
 * 3. Browser uploads file directly to Supabase Storage via uploadToSignedUrl
 * 4. Server Action savePhotoRecord inserts the property_photos DB row
 */
export default function PhotoUploader({ propertyId, photos }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function getPublicUrl(storagePath: string): string {
    const supabase = createClient()
    const { data } = supabase.storage
      .from('property-photos')
      .getPublicUrl(storagePath)
    return data.publicUrl
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      // Step 1: Get signed URL from server (ownership verified server-side)
      const result = await getSignedUploadUrl(propertyId)
      if ('error' in result) throw new Error(result.error)

      // Step 2: Upload directly from browser to Supabase Storage
      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from('property-photos')
        .uploadToSignedUrl(result.path, result.token, file)
      if (uploadError) throw uploadError

      // Step 3: Save the photo record in the database
      const saveResult = await savePhotoRecord(propertyId, result.path)
      if (saveResult.error) throw new Error(saveResult.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Photos</h3>

        {/* Hidden file input — intentionally NOT inside a <form> */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleUpload}
          className="hidden"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
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

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}

      {photos.length === 0 ? (
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
      )}
    </div>
  )
}
