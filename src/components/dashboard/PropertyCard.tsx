import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PropertyCardProps {
  property: {
    id: string
    name: string
    location: string
    bedrooms: number
    bathrooms: number
    max_guests: number
    nightly_rate: number
    property_photos: Array<{ id: string; storage_path: string; display_order: number }>
  }
}

/**
 * Server-compatible property summary card for the dashboard list.
 * Constructs Supabase public URL directly — no client import needed.
 */
export function PropertyCard({ property }: PropertyCardProps) {
  const sortedPhotos = [...property.property_photos].sort(
    (a, b) => a.display_order - b.display_order
  )
  const coverPhoto = sortedPhotos[0]
  const publicUrl = coverPhoto
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${coverPhoto.storage_path}`
    : null

  return (
    <Link href={`/dashboard/properties/${property.id}`} className="group">
      <Card className="overflow-hidden h-full transition-shadow hover:shadow-md">
        {/* Cover image */}
        <div className="relative aspect-video bg-muted">
          {publicUrl ? (
            <Image
              src={publicUrl}
              alt={`${property.name} cover photo`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
              <p className="text-sm text-muted-foreground">No photos</p>
            </div>
          )}
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-base leading-tight group-hover:underline">
            {property.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{property.location}</p>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-3">
            {property.bedrooms} bed &middot; {property.bathrooms} bath &middot; {property.max_guests} guests
          </p>
          <Badge variant="secondary">
            ${property.nightly_rate.toLocaleString()}/night
          </Badge>
        </CardContent>
      </Card>
    </Link>
  )
}
