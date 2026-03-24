'use client'

import { useActionState, useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/browser'
import {
  getExperienceUploadUrl,
  saveExperiencePhoto,
  removeExperiencePhoto,
} from '@/lib/actions/photos'
import { TimeInput } from '@/components/ui/time-input'
import type { ActionState } from '@/lib/validations/property'
import type { TimeSlot } from '@/types/database'

interface AddOnFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>
  initialData?: {
    name?: string
    description?: string | null
    price?: number
    pricing_unit?: 'per_person' | 'per_booking'
    max_quantity?: number | null
    included_guests?: number | null
    per_person_above?: number | null
    photo_url?: string | null
    duration_min?: number | null
    available_slots?: TimeSlot[]
  }
  /** Required for photo upload (only available when editing an existing add-on) */
  addOnId?: string
  propertyId?: string
  submitLabel?: string
  onCancel?: () => void
  /** Called when a new add-on is created, with the new ID (for auto-switching to edit mode) */
  onCreated?: (addOnId: string) => void
}

const EMPTY_SLOT: TimeSlot = { start: '', end: '' }

export function AddOnForm({ action, initialData, addOnId, propertyId, submitLabel, onCancel, onCreated }: AddOnFormProps) {
  const [state, formAction, pending] = useActionState(action, {})
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialData?.photo_url ?? null)
  const [slots, setSlots] = useState<TimeSlot[]>(
    initialData?.available_slots?.length ? [...initialData.available_slots] : []
  )
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Staged file for upload after creation (when no addOnId yet)
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [stagedPreview, setStagedPreview] = useState<string | null>(null)

  // Close edit mode on successful save, or notify parent of new add-on
  useEffect(() => {
    if (state.message?.includes('successfully')) {
      if (state.addOnId && propertyId && stagedFile) {
        // Auto-upload staged photo after creation
        uploadStagedPhoto(state.addOnId, propertyId, stagedFile).then(() => {
          onCreated?.(state.addOnId!)
        })
      } else if (state.addOnId && onCreated) {
        onCreated(state.addOnId)
      } else if (onCancel) {
        onCancel()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.message, state.addOnId])

  async function uploadStagedPhoto(newAddOnId: string, propId: string, file: File) {
    setUploading(true)
    try {
      const result = await getExperienceUploadUrl(newAddOnId, propId)
      if ('error' in result) throw new Error(result.error)

      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from('property-photos')
        .uploadToSignedUrl(result.path, result.token, file)
      if (uploadError) throw uploadError

      await saveExperiencePhoto(newAddOnId, result.path)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setUploading(false)
      setStagedFile(null)
      setStagedPreview(null)
    }
  }

  const canUploadPhoto = Boolean(addOnId && propertyId)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !addOnId || !propertyId) return

    // Validate 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('File must be under 10MB')
      return
    }

    setUploading(true)
    setPhotoError(null)

    try {
      // Step 1: Get signed URL
      const result = await getExperienceUploadUrl(addOnId, propertyId)
      if ('error' in result) throw new Error(result.error)

      // Step 2: Upload directly to Supabase Storage
      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from('property-photos')
        .uploadToSignedUrl(result.path, result.token, file)
      if (uploadError) throw uploadError

      // Step 3: Save the photo URL to the add-on record
      const saveResult = await saveExperiencePhoto(addOnId, result.path)
      if (saveResult.error) throw new Error(saveResult.error)

      // Show the uploaded photo
      const { data } = supabase.storage
        .from('property-photos')
        .getPublicUrl(result.path)
      setPhotoUrl(data.publicUrl)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handlePhotoRemove() {
    if (!addOnId || !propertyId || !photoUrl) return

    setPhotoError(null)
    try {
      // Extract storage path from public URL
      const pathMatch = photoUrl.match(/property-photos\/(.+)$/)
      const storagePath = pathMatch ? pathMatch[1] : ''

      const result = await removeExperiencePhoto(addOnId, propertyId, storagePath)
      if (result.error) throw new Error(result.error)
      setPhotoUrl(null)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Remove failed')
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.message && !state.message.includes('successfully') && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      {/* Photo Upload */}
      <div className="space-y-2">
        <Label>Photo</Label>
        {canUploadPhoto ? (
          <>
            {photoUrl ? (
              <div className="relative w-full max-w-xs aspect-video rounded-lg overflow-hidden border">
                <Image
                  src={photoUrl}
                  alt="Experience photo"
                  fill
                  className="object-cover"
                  sizes="320px"
                />
                <button
                  type="button"
                  onClick={handlePhotoRemove}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-destructive transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex flex-col items-center justify-center w-full max-w-xs aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-sm text-muted-foreground">Upload Photo</span>
                  </>
                )}
              </button>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {photoError && (
              <p className="text-sm text-destructive">{photoError}</p>
            )}
          </>
        ) : (
          <>
            {stagedPreview ? (
              <div className="relative w-full max-w-xs aspect-video rounded-lg overflow-hidden border">
                <Image
                  src={stagedPreview}
                  alt="Staged photo preview"
                  fill
                  className="object-cover"
                  sizes="320px"
                />
                <button
                  type="button"
                  onClick={() => {
                    setStagedFile(null)
                    if (stagedPreview) URL.revokeObjectURL(stagedPreview)
                    setStagedPreview(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-destructive transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full max-w-xs aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer"
              >
                <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-sm text-muted-foreground">Upload Photo</span>
              </button>
            )}

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 10 * 1024 * 1024) {
                  setPhotoError('File must be under 10MB')
                  return
                }
                setStagedFile(file)
                setStagedPreview(URL.createObjectURL(file))
                setPhotoError(null)
              }}
              className="hidden"
            />

            {photoError && (
              <p className="text-sm text-destructive">{photoError}</p>
            )}
          </>
        )}
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="addon-name">Name</Label>
        <Input
          id="addon-name"
          name="name"
          defaultValue={initialData?.name}
          placeholder="Private chef dinner"
          required
        />
        {state.errors?.name && (
          <p className="text-sm text-destructive">{state.errors.name[0]}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="addon-description">Description (optional)</Label>
        <Textarea
          id="addon-description"
          name="description"
          rows={2}
          defaultValue={initialData?.description ?? ''}
          placeholder="Describe this experience..."
        />
        {state.errors?.description && (
          <p className="text-sm text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Price */}
        <div className="space-y-1.5">
          <Label htmlFor="addon-price">Price ($)</Label>
          <Input
            id="addon-price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initialData?.price ?? ''}
            required
          />
          {state.errors?.price && (
            <p className="text-sm text-destructive">{state.errors.price[0]}</p>
          )}
        </div>

        {/* Pricing Unit */}
        <div className="space-y-1.5">
          <Label htmlFor="addon-pricing-unit">Pricing</Label>
          <Select name="pricing_unit" defaultValue={initialData?.pricing_unit ?? 'per_booking'}>
            <SelectTrigger id="addon-pricing-unit">
              <SelectValue placeholder="Select pricing type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="per_booking">Per Booking</SelectItem>
              <SelectItem value="per_person">Per Person</SelectItem>
            </SelectContent>
          </Select>
          {state.errors?.pricing_unit && (
            <p className="text-sm text-destructive">{state.errors.pricing_unit[0]}</p>
          )}
        </div>

        {/* Max Quantity */}
        <div className="space-y-1.5">
          <Label htmlFor="addon-max-quantity">Max Quantity (optional)</Label>
          <Input
            id="addon-max-quantity"
            name="max_quantity"
            type="number"
            min="1"
            defaultValue={initialData?.max_quantity ?? ''}
            placeholder="Leave empty for unlimited"
          />
          {state.errors?.max_quantity && (
            <p className="text-sm text-destructive">{state.errors.max_quantity[0]}</p>
          )}
        </div>
      </div>

      {/* Tiered Pricing */}
      <div className="space-y-2">
        <Label>Tiered Pricing</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="addon-included-guests" className="text-xs">Included Guests</Label>
            <Input
              id="addon-included-guests"
              name="included_guests"
              type="number"
              min="1"
              defaultValue={initialData?.included_guests ?? ''}
            />
            {state.errors?.included_guests && (
              <p className="text-sm text-destructive">{state.errors.included_guests[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addon-per-person-above" className="text-xs">Per Person Above ($)</Label>
            <Input
              id="addon-per-person-above"
              name="per_person_above"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialData?.per_person_above ?? ''}
            />
            {state.errors?.per_person_above && (
              <p className="text-sm text-destructive">{state.errors.per_person_above[0]}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Optional. Base price includes up to this many guests, then charge per additional person.</p>
      </div>

      {/* Scheduling — Time Slots */}
      <div className="space-y-3">
        <Label>Scheduling (optional)</Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Add time slots if guests can book this experience at specific times during their stay.
        </p>

        {slots.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="addon-duration">Duration (minutes)</Label>
            <Input
              id="addon-duration"
              name="duration_min"
              type="number"
              min={15}
              max={1440}
              defaultValue={initialData?.duration_min ?? 60}
            />
            {state.errors?.duration_min && (
              <p className="text-sm text-destructive">{(state.errors as Record<string, string[]>).duration_min[0]}</p>
            )}
          </div>
        )}

        {slots.map((slot, i) => (
          <div key={i} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <TimeInput
              value={slot.start}
              onChange={(val) => {
                const updated = [...slots]
                updated[i] = { ...updated[i], start: val }
                setSlots(updated)
              }}
              aria-label={`Slot ${i + 1} start time`}
            />
            <span className="text-muted-foreground text-sm shrink-0">to</span>
            <TimeInput
              value={slot.end}
              onChange={(val) => {
                const updated = [...slots]
                updated[i] = { ...updated[i], end: val }
                setSlots(updated)
              }}
              aria-label={`Slot ${i + 1} end time`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSlots(slots.filter((_, j) => j !== i))}
              className="text-destructive hover:text-destructive shrink-0"
            >
              Remove
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSlots([...slots, { ...EMPTY_SLOT }])}
        >
          + Add Time Slot
        </Button>

        {/* Hidden field to pass slots as JSON to the FormData-based server action */}
        <input type="hidden" name="available_slots" value={JSON.stringify(slots)} />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving...' : (submitLabel ?? 'Add Experience')}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
