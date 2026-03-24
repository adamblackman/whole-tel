'use client'

import { useState, useTransition } from 'react'
import { ApplicationStepIndicator } from './ApplicationStepIndicator'
import { submitApplication } from '@/lib/actions/applications'
import {
  PropertyBasicsSchema,
  CapacitySchema,
  CommonAreasSchema,
  GroupHostingSchema,
  LogisticsSchema,
  type PropertyBasicsData,
  type CapacityData,
  type CommonAreasData,
  type GroupHostingData,
  type LogisticsData,
} from '@/lib/validations/application'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STEP_LABELS = [
  'Property Basics',
  'Capacity',
  'Common Areas',
  'Group Hosting',
  'Logistics',
]

type StepData = {
  propertyBasics?: Partial<PropertyBasicsData>
  capacity?: Partial<CapacityData>
  commonAreas?: Partial<CommonAreasData>
  groupHosting?: Partial<GroupHostingData>
  logistics?: Partial<LogisticsData>
}

// --- Step 0: Property Basics ---
function StepPropertyBasics({
  initialData,
  onNext,
}: {
  initialData?: Partial<PropertyBasicsData>
  onNext: (data: PropertyBasicsData) => void
}) {
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const raw = {
      propertyName: fd.get('propertyName'),
      location: fd.get('location'),
      propertyType: fd.get('propertyType'),
      description: fd.get('description'),
    }
    const result = PropertyBasicsSchema.safeParse(raw)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please fix the errors above')
      return
    }
    setError(null)
    onNext(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="propertyName">Property Name</Label>
        <Input
          id="propertyName"
          name="propertyName"
          defaultValue={initialData?.propertyName ?? ''}
          placeholder="e.g. Casa del Sol"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          name="location"
          defaultValue={initialData?.location ?? ''}
          placeholder="e.g. Cabo San Lucas, Mexico"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="propertyType">Property Type</Label>
        <select
          id="propertyType"
          name="propertyType"
          defaultValue={initialData?.propertyType ?? ''}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        >
          <option value="" disabled>Select type...</option>
          <option value="villa">Villa</option>
          <option value="estate">Estate</option>
          <option value="boutique_hotel">Boutique Hotel</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initialData?.description ?? ''}
          placeholder="Tell us about your property..."
          rows={4}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end pt-2">
        <Button type="submit">Next</Button>
      </div>
    </form>
  )
}

// --- Step 1: Capacity ---
function StepCapacity({
  initialData,
  onBack,
  onNext,
}: {
  initialData?: Partial<CapacityData>
  onBack: () => void
  onNext: (data: CapacityData) => void
}) {
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const raw = {
      maxGuests: fd.get('maxGuests'),
      bedrooms: fd.get('bedrooms'),
      bathrooms: fd.get('bathrooms'),
      bedConfig: {
        king: fd.get('king'),
        queen: fd.get('queen'),
        double: fd.get('double'),
        twin: fd.get('twin'),
        bunk: fd.get('bunk'),
      },
    }
    const result = CapacitySchema.safeParse(raw)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please fix the errors above')
      return
    }
    setError(null)
    onNext(result.data)
  }

  const bedCfg = initialData?.bedConfig

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label htmlFor="maxGuests">Max Guests</Label>
          <Input id="maxGuests" name="maxGuests" type="number" min={2} defaultValue={initialData?.maxGuests ?? ''} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input id="bedrooms" name="bedrooms" type="number" min={1} defaultValue={initialData?.bedrooms ?? ''} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input id="bathrooms" name="bathrooms" type="number" min={1} defaultValue={initialData?.bathrooms ?? ''} required />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Bed Configuration</p>
        <div className="grid grid-cols-5 gap-3">
          {(['king', 'queen', 'double', 'twin', 'bunk'] as const).map((type) => (
            <div key={type} className="space-y-1">
              <Label htmlFor={type} className="capitalize text-xs">{type}</Label>
              <Input
                id={type}
                name={type}
                type="number"
                min={0}
                defaultValue={bedCfg?.[type] ?? 0}
              />
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit">Next</Button>
      </div>
    </form>
  )
}

// --- Step 2: Common Areas ---
function StepCommonAreas({
  initialData,
  onBack,
  onNext,
}: {
  initialData?: Partial<CommonAreasData>
  onBack: () => void
  onNext: (data: CommonAreasData) => void
}) {
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const raw = {
      hasPool: fd.get('hasPool') === 'on',
      hasHotTub: fd.get('hasHotTub') === 'on',
      outdoorSpaces: fd.get('outdoorSpaces') || undefined,
      kitchenType: fd.get('kitchenType'),
      notableAmenities: fd.get('notableAmenities') || undefined,
    }
    const result = CommonAreasSchema.safeParse(raw)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please fix the errors above')
      return
    }
    setError(null)
    onNext(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="hasPool"
            defaultChecked={initialData?.hasPool ?? false}
            className="w-4 h-4 rounded border-gray-300 text-teal-600"
          />
          <span className="text-sm font-medium">Swimming Pool</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="hasHotTub"
            defaultChecked={initialData?.hasHotTub ?? false}
            className="w-4 h-4 rounded border-gray-300 text-teal-600"
          />
          <span className="text-sm font-medium">Hot Tub / Jacuzzi</span>
        </label>
      </div>

      <div className="space-y-1">
        <Label htmlFor="outdoorSpaces">Outdoor Spaces (optional)</Label>
        <Textarea
          id="outdoorSpaces"
          name="outdoorSpaces"
          defaultValue={initialData?.outdoorSpaces ?? ''}
          placeholder="e.g. Rooftop terrace, BBQ area, fire pit..."
          rows={2}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="kitchenType">Kitchen Type</Label>
        <select
          id="kitchenType"
          name="kitchenType"
          defaultValue={initialData?.kitchenType ?? ''}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        >
          <option value="" disabled>Select kitchen type...</option>
          <option value="commercial">Commercial</option>
          <option value="full">Full Kitchen</option>
          <option value="basic">Basic Kitchen</option>
          <option value="none">None</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notableAmenities">Notable Amenities (optional)</Label>
        <Textarea
          id="notableAmenities"
          name="notableAmenities"
          defaultValue={initialData?.notableAmenities ?? ''}
          placeholder="e.g. Home theater, game room, gym, concierge..."
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit">Next</Button>
      </div>
    </form>
  )
}

// --- Step 3: Group Hosting ---
function StepGroupHosting({
  initialData,
  onBack,
  onNext,
}: {
  initialData?: Partial<GroupHostingData>
  onBack: () => void
  onNext: (data: GroupHostingData) => void
}) {
  const [hasExperience, setHasExperience] = useState(
    initialData?.hasGroupExperience ?? false
  )
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const raw = {
      hasGroupExperience: fd.get('hasGroupExperience') === 'on',
      groupExperienceDetails: fd.get('groupExperienceDetails') || undefined,
      maxGroupSize: fd.get('maxGroupSize') || undefined,
      uniqueForGroups: fd.get('uniqueForGroups'),
    }
    const result = GroupHostingSchema.safeParse(raw)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please fix the errors above')
      return
    }
    setError(null)
    onNext(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          name="hasGroupExperience"
          checked={hasExperience}
          onChange={(e) => setHasExperience(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-teal-600"
        />
        <span className="text-sm font-medium">I have experience hosting large groups</span>
      </label>

      {hasExperience && (
        <div className="space-y-1">
          <Label htmlFor="groupExperienceDetails">Tell us about that experience</Label>
          <Textarea
            id="groupExperienceDetails"
            name="groupExperienceDetails"
            defaultValue={initialData?.groupExperienceDetails ?? ''}
            placeholder="e.g. Corporate retreats, wedding groups, sports teams..."
            rows={3}
          />
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="maxGroupSize">Max Group Size You&apos;re Comfortable With (optional)</Label>
        <Input
          id="maxGroupSize"
          name="maxGroupSize"
          type="number"
          min={1}
          defaultValue={initialData?.maxGroupSize ?? ''}
          placeholder="Leave blank if same as max guests"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="uniqueForGroups">What Makes Your Property Special for Groups?</Label>
        <Textarea
          id="uniqueForGroups"
          name="uniqueForGroups"
          defaultValue={initialData?.uniqueForGroups ?? ''}
          placeholder="e.g. Open-plan living, multiple entertainment areas, dedicated event space..."
          rows={4}
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit">Next</Button>
      </div>
    </form>
  )
}

// --- Step 4: Logistics ---
function StepLogistics({
  initialData,
  onBack,
  onSubmit,
  isPending,
}: {
  initialData?: Partial<LogisticsData>
  onBack: () => void
  onSubmit: (data: LogisticsData) => void
  isPending: boolean
}) {
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const raw = {
      checkInTime: fd.get('checkInTime'),
      checkOutTime: fd.get('checkOutTime'),
      minimumStay: fd.get('minimumStay'),
      photoLinks: fd.get('photoLinks') || undefined,
      contactName: fd.get('contactName'),
      contactEmail: fd.get('contactEmail'),
      contactPhone: fd.get('contactPhone'),
    }
    const result = LogisticsSchema.safeParse(raw)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please fix the errors above')
      return
    }
    setError(null)
    onSubmit(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="checkInTime">Check-in Time</Label>
          <Input
            id="checkInTime"
            name="checkInTime"
            defaultValue={initialData?.checkInTime ?? ''}
            placeholder="e.g. 3:00 PM"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="checkOutTime">Check-out Time</Label>
          <Input
            id="checkOutTime"
            name="checkOutTime"
            defaultValue={initialData?.checkOutTime ?? ''}
            placeholder="e.g. 11:00 AM"
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="minimumStay">Minimum Stay (nights)</Label>
        <Input
          id="minimumStay"
          name="minimumStay"
          type="number"
          min={1}
          defaultValue={initialData?.minimumStay ?? ''}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="photoLinks">Photo Links (optional)</Label>
        <Textarea
          id="photoLinks"
          name="photoLinks"
          defaultValue={initialData?.photoLinks ?? ''}
          placeholder="Paste Google Drive or Dropbox link to property photos"
          rows={2}
        />
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Contact Information</p>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="contactName">Your Name</Label>
            <Input
              id="contactName"
              name="contactName"
              defaultValue={initialData?.contactName ?? ''}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="contactEmail">Email Address</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={initialData?.contactEmail ?? ''}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactPhone">Phone Number</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                defaultValue={initialData?.contactPhone ?? ''}
                required
              />
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isPending}>
          Back
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Submitting...' : 'Submit Application'}
        </Button>
      </div>
    </form>
  )
}

// --- Confirmation ---
function Confirmation() {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
        <svg
          className="w-8 h-8 text-teal-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold">Application Received</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Thank you for applying to be a Whole-Tel partner. Our team will review
        your application and reach out within 3&ndash;5 business days.
      </p>
      <a
        href="/"
        className="inline-block mt-4 text-sm text-teal-700 underline underline-offset-2 hover:text-teal-900"
      >
        &larr; Back to home
      </a>
    </div>
  )
}

// --- Main ApplicationForm ---
export function ApplicationForm() {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<StepData>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleStep0(data: PropertyBasicsData) {
    setFormData((prev) => ({ ...prev, propertyBasics: data }))
    setStep(1)
  }

  function handleStep1(data: CapacityData) {
    setFormData((prev) => ({ ...prev, capacity: data }))
    setStep(2)
  }

  function handleStep2(data: CommonAreasData) {
    setFormData((prev) => ({ ...prev, commonAreas: data }))
    setStep(3)
  }

  function handleStep3(data: GroupHostingData) {
    setFormData((prev) => ({ ...prev, groupHosting: data }))
    setStep(4)
  }

  function handleStep4(data: LogisticsData) {
    setFormData((prev) => {
      const fullData = { ...prev, logistics: data }
      startTransition(async () => {
        const result = await submitApplication(fullData)
        if (result.error) {
          setSubmitError(result.error)
        } else {
          setSubmitted(true)
        }
      })
      return fullData
    })
  }

  if (submitted) {
    return <Confirmation />
  }

  return (
    <div className="w-full">
      <ApplicationStepIndicator
        current={step}
        total={STEP_LABELS.length}
        labels={STEP_LABELS}
      />

      {submitError && (
        <p className="text-sm text-destructive text-center mb-4">{submitError}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{STEP_LABELS[step]}</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <StepPropertyBasics
              initialData={formData.propertyBasics}
              onNext={handleStep0}
            />
          )}
          {step === 1 && (
            <StepCapacity
              initialData={formData.capacity}
              onBack={() => setStep(0)}
              onNext={handleStep1}
            />
          )}
          {step === 2 && (
            <StepCommonAreas
              initialData={formData.commonAreas}
              onBack={() => setStep(1)}
              onNext={handleStep2}
            />
          )}
          {step === 3 && (
            <StepGroupHosting
              initialData={formData.groupHosting}
              onBack={() => setStep(2)}
              onNext={handleStep3}
            />
          )}
          {step === 4 && (
            <StepLogistics
              initialData={formData.logistics}
              onBack={() => setStep(3)}
              onSubmit={handleStep4}
              isPending={isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
