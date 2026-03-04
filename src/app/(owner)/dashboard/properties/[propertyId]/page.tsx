import { requireOwner } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PhotoUploader from '@/components/dashboard/PhotoUploader'
import { AddOnList } from '@/components/dashboard/AddOnList'
import { DeletePropertyButton } from '@/components/dashboard/DeletePropertyButton'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const user = await requireOwner()
  const { propertyId } = await params
  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select(`
      *,
      property_photos(id, storage_path, display_order),
      add_ons(id, name, description, price, pricing_unit, max_quantity)
    `)
    .eq('id', propertyId)
    .eq('owner_id', user.id)
    .single()

  if (!property) notFound()

  const sortedPhotos = [...property.property_photos].sort(
    (a, b) => a.display_order - b.display_order
  )

  const amenities = Array.isArray(property.amenities)
    ? (property.amenities as string[])
    : []

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{property.name}</h1>
          <p className="text-muted-foreground">{property.location}</p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/dashboard/properties/${propertyId}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Property Details */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Details</h2>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          {property.address && (
            <div>
              <span className="text-muted-foreground">Address</span>
              <p className="font-medium">{property.address}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Bedrooms</span>
            <p className="font-medium">{property.bedrooms}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Bathrooms</span>
            <p className="font-medium">{property.bathrooms}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Max Guests</span>
            <p className="font-medium">{property.max_guests}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Nightly Rate</span>
            <p className="font-medium">${property.nightly_rate.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Cleaning Fee</span>
            <p className="font-medium">${property.cleaning_fee.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Check-in</span>
            <p className="font-medium">{property.check_in_time}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Check-out</span>
            <p className="font-medium">{property.check_out_time}</p>
          </div>
        </div>

        {property.description && (
          <div className="text-sm">
            <span className="text-muted-foreground">Description</span>
            <p className="mt-1">{property.description}</p>
          </div>
        )}

        {amenities.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Amenities</p>
            <div className="flex flex-wrap gap-1.5">
              {amenities.map((amenity) => (
                <Badge key={amenity} variant="secondary">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {property.house_rules && (
          <div className="text-sm">
            <span className="text-muted-foreground">House Rules</span>
            <p className="mt-1 whitespace-pre-line">{property.house_rules}</p>
          </div>
        )}
      </section>

      <Separator />

      {/* Photos */}
      <section>
        <PhotoUploader
          propertyId={propertyId}
          photos={sortedPhotos}
        />
      </section>

      <Separator />

      {/* Add-ons */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Experiences &amp; Add-ons</h2>
        <AddOnList
          propertyId={propertyId}
          addOns={property.add_ons}
        />
      </section>

      <Separator className="my-8" />

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/20 p-6">
        <h3 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Deleting this property will permanently remove all photos, add-on experiences, and booking records.
        </p>
        <DeletePropertyButton propertyId={propertyId} propertyName={property.name} />
      </div>
    </div>
  )
}
