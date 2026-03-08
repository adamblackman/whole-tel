import { requireOwner } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PropertyForm } from '@/components/dashboard/PropertyForm'
import { PhotoManager } from '@/components/dashboard/PhotoManager'
import { updateProperty } from '@/lib/actions/properties'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const user = await requireOwner()
  const { propertyId } = await params
  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('id, name, description, location, address, bedrooms, bathrooms, max_guests, nightly_rate, cleaning_fee, amenities, house_rules, check_in_time, check_out_time, bed_config, guest_threshold, per_person_rate, property_photos(id, storage_path, display_order, section)')
    .eq('id', propertyId)
    .eq('owner_id', user.id)
    .single()

  if (!property) notFound()

  // Bind propertyId into updateProperty — produces a new Server Action that can be passed to the Client Component
  const updateWithId = updateProperty.bind(null, propertyId)

  const amenities = Array.isArray(property.amenities)
    ? (property.amenities as string[])
    : []

  const sortedPhotos = [...property.property_photos].sort(
    (a, b) => a.display_order - b.display_order
  )

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href={`/dashboard/properties/${propertyId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Property
          </Link>
        </Button>
        <h1 className="text-2xl font-bold mb-6">Edit Property</h1>
        <PropertyForm
          action={updateWithId}
          initialData={{
            ...property,
            amenities,
          }}
          submitLabel="Save Changes"
        >
          <Separator />
          <PhotoManager
            propertyId={propertyId}
            photos={sortedPhotos}
          />
        </PropertyForm>
      </div>
    </div>
  )
}
