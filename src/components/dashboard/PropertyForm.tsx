'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Upload } from 'lucide-react'
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
import type { ActionState } from '@/lib/validations/property'
import type { BedConfig } from '@/types/database'

const LOCATIONS = ['Cabo San Lucas', 'Puerto Vallarta', 'Miami'] as const

const AMENITY_OPTIONS = [
  'Pool',
  'Hot Tub',
  'BBQ',
  'Ocean View',
  'Rooftop',
  'Private Beach',
  'Chef Kitchen',
  'Game Room',
  'Home Theater',
  'Gym',
  'Parking',
  'WiFi',
] as const

interface PropertyFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>
  initialData?: {
    name?: string
    description?: string
    location?: string
    address?: string
    bedrooms?: number
    bathrooms?: number
    max_guests?: number
    nightly_rate?: number
    cleaning_fee?: number
    amenities?: string[]
    house_rules?: string
    check_in_time?: string
    check_out_time?: string
    bed_config?: BedConfig
    guest_threshold?: number | null
    per_person_rate?: number | null
  }
  submitLabel?: string
  /** When true, photos are managed on the detail page — hide placeholder */
  hidePhotos?: boolean
}

export function PropertyForm({ action, initialData, submitLabel, hidePhotos }: PropertyFormProps) {
  const [state, formAction, pending] = useActionState(action, {})
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    initialData?.amenities ?? []
  )

  function toggleAmenity(amenity: string) {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    )
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      {/* Name — full width */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Property Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initialData?.name}
          placeholder="Puerto Vallarta Casa del Mar"
          required
        />
        {state.errors?.name && (
          <p className="text-sm text-destructive">{state.errors.name[0]}</p>
        )}
      </div>

      {/* Two-column grid */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Location */}
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Select name="location" defaultValue={initialData?.location}>
            <SelectTrigger id="location">
              <SelectValue placeholder="Select a destination" />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.errors?.location && (
            <p className="text-sm text-destructive">{state.errors.location[0]}</p>
          )}
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label htmlFor="address">Address (optional)</Label>
          <Input
            id="address"
            name="address"
            defaultValue={initialData?.address ?? ''}
            placeholder="123 Ocean Drive"
          />
          {state.errors?.address && (
            <p className="text-sm text-destructive">{state.errors.address[0]}</p>
          )}
        </div>

        {/* Bedrooms */}
        <div className="space-y-1.5">
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            name="bedrooms"
            type="number"
            min="1"
            defaultValue={initialData?.bedrooms ?? 1}
            required
          />
          {state.errors?.bedrooms && (
            <p className="text-sm text-destructive">{state.errors.bedrooms[0]}</p>
          )}
        </div>

        {/* Bathrooms */}
        <div className="space-y-1.5">
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input
            id="bathrooms"
            name="bathrooms"
            type="number"
            min="1"
            defaultValue={initialData?.bathrooms ?? 1}
            required
          />
          {state.errors?.bathrooms && (
            <p className="text-sm text-destructive">{state.errors.bathrooms[0]}</p>
          )}
        </div>

        {/* Max Guests */}
        <div className="space-y-1.5">
          <Label htmlFor="max_guests">Max Guests</Label>
          <Input
            id="max_guests"
            name="max_guests"
            type="number"
            min="1"
            defaultValue={initialData?.max_guests ?? 1}
            required
          />
          {state.errors?.max_guests && (
            <p className="text-sm text-destructive">{state.errors.max_guests[0]}</p>
          )}
        </div>

        {/* Nightly Rate */}
        <div className="space-y-1.5">
          <Label htmlFor="nightly_rate">Nightly Rate ($)</Label>
          <Input
            id="nightly_rate"
            name="nightly_rate"
            type="number"
            min="1"
            step="0.01"
            defaultValue={initialData?.nightly_rate ?? ''}
            required
          />
          {state.errors?.nightly_rate && (
            <p className="text-sm text-destructive">{state.errors.nightly_rate[0]}</p>
          )}
        </div>

        {/* Cleaning Fee */}
        <div className="space-y-1.5">
          <Label htmlFor="cleaning_fee">Cleaning Fee ($)</Label>
          <Input
            id="cleaning_fee"
            name="cleaning_fee"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initialData?.cleaning_fee ?? 0}
          />
          {state.errors?.cleaning_fee && (
            <p className="text-sm text-destructive">{state.errors.cleaning_fee[0]}</p>
          )}
        </div>

        {/* Check-in time */}
        <div className="space-y-1.5">
          <Label htmlFor="check_in_time">Check-in Time</Label>
          <Input
            id="check_in_time"
            name="check_in_time"
            defaultValue={initialData?.check_in_time ?? '3:00 PM'}
          />
          {state.errors?.check_in_time && (
            <p className="text-sm text-destructive">{state.errors.check_in_time[0]}</p>
          )}
        </div>

        {/* Check-out time */}
        <div className="space-y-1.5">
          <Label htmlFor="check_out_time">Check-out Time</Label>
          <Input
            id="check_out_time"
            name="check_out_time"
            defaultValue={initialData?.check_out_time ?? '11:00 AM'}
          />
          {state.errors?.check_out_time && (
            <p className="text-sm text-destructive">{state.errors.check_out_time[0]}</p>
          )}
        </div>

      </div>

      {/* Bed Configuration */}
      <div className="space-y-2">
        <Label>Bed Configuration</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {([
            ['bed_king', 'King', initialData?.bed_config?.king ?? 0],
            ['bed_queen', 'Queen', initialData?.bed_config?.queen ?? 0],
            ['bed_double', 'Double', initialData?.bed_config?.double ?? 0],
            ['bed_twin', 'Twin', initialData?.bed_config?.twin ?? 0],
            ['bed_bunk', 'Bunk', initialData?.bed_config?.bunk ?? 0],
          ] as const).map(([name, label, defaultVal]) => (
            <div key={name} className="space-y-1">
              <Label htmlFor={name} className="text-xs">{label}</Label>
              <Input
                id={name}
                name={name}
                type="number"
                min="0"
                defaultValue={defaultVal}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Per-Person Pricing */}
      <div className="space-y-2">
        <Label>Per-Person Pricing</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="guest_threshold" className="text-xs">Guest Threshold</Label>
            <Input
              id="guest_threshold"
              name="guest_threshold"
              type="number"
              min="1"
              defaultValue={initialData?.guest_threshold ?? ''}
            />
            {state.errors?.guest_threshold && (
              <p className="text-sm text-destructive">{state.errors.guest_threshold[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="per_person_rate" className="text-xs">Rate Per Person Above Threshold ($)</Label>
            <Input
              id="per_person_rate"
              name="per_person_rate"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialData?.per_person_rate ?? ''}
            />
            {state.errors?.per_person_rate && (
              <p className="text-sm text-destructive">{state.errors.per_person_rate[0]}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Optional. Charge extra per guest per night above this threshold.</p>
      </div>

      {/* Description — full width */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={initialData?.description ?? ''}
          placeholder="Describe your property..."
        />
        {state.errors?.description && (
          <p className="text-sm text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      {/* Amenities checkbox group — full width */}
      <div className="space-y-2">
        <Label>Amenities</Label>
        {/* Hidden input serializes checked values for the Server Action */}
        <input type="hidden" name="amenities" value={selectedAmenities.join(',')} />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {AMENITY_OPTIONS.map((amenity) => (
            <label
              key={amenity}
              className="flex items-center gap-2 text-sm cursor-pointer select-none"
            >
              <input
                type="checkbox"
                className="rounded border-input"
                checked={selectedAmenities.includes(amenity)}
                onChange={() => toggleAmenity(amenity)}
              />
              {amenity}
            </label>
          ))}
        </div>
        {state.errors?.amenities && (
          <p className="text-sm text-destructive">{state.errors.amenities[0]}</p>
        )}
      </div>

      {/* House Rules — full width */}
      <div className="space-y-1.5">
        <Label htmlFor="house_rules">House Rules (optional)</Label>
        <Textarea
          id="house_rules"
          name="house_rules"
          rows={3}
          defaultValue={initialData?.house_rules ?? ''}
          placeholder="No smoking, no pets..."
        />
        {state.errors?.house_rules && (
          <p className="text-sm text-destructive">{state.errors.house_rules[0]}</p>
        )}
      </div>

      {/* Photos placeholder (create mode only — edit mode manages photos on detail page) */}
      {!hidePhotos && (
        <div className="space-y-2">
          <Label>Photos</Label>
          <div className="flex flex-col items-center justify-center w-full aspect-video max-w-sm rounded-lg border-2 border-dashed border-muted-foreground/15">
            <Upload className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <span className="text-sm text-muted-foreground/60">Save to upload photos</span>
          </div>
        </div>
      )}

      {/* Form actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : (submitLabel ?? 'Create Property')}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
