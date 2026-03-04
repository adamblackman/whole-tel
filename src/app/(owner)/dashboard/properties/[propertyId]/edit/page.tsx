import { requireOwner } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PropertyForm } from '@/components/dashboard/PropertyForm'
import { updateProperty } from '@/lib/actions/properties'
import { Button } from '@/components/ui/button'
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
    .select('id, name, description, location, address, bedrooms, bathrooms, max_guests, nightly_rate, cleaning_fee, amenities, house_rules, check_in_time, check_out_time')
    .eq('id', propertyId)
    .eq('owner_id', user.id)
    .single()

  if (!property) notFound()

  // Bind propertyId into updateProperty — produces a new Server Action that can be passed to the Client Component
  const updateWithId = updateProperty.bind(null, propertyId)

  const amenities = Array.isArray(property.amenities)
    ? (property.amenities as string[])
    : []

  return (
    <div className="max-w-2xl">
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
      />
    </div>
  )
}
