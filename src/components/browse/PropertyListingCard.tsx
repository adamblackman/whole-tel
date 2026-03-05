import Image from 'next/image'
import Link from 'next/link'
import { BedDouble, Bath, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PropertyListingCardProps {
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
 * Server-compatible property listing card for the guest browse grid.
 * Links to /properties/{id}. Constructs Supabase public URL directly.
 */
export function PropertyListingCard({ property }: PropertyListingCardProps) {
  const sortedPhotos = [...property.property_photos].sort(
    (a, b) => a.display_order - b.display_order
  )
  const coverPhoto = sortedPhotos[0]
  const publicUrl = coverPhoto
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${coverPhoto.storage_path}`
    : null

  return (
    <Link href={`/properties/${property.id}`} className="group">
      <Card className="overflow-hidden h-full group-hover:shadow-lg transition-shadow">
        {/* Cover image */}
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {publicUrl ? (
            <Image
              src={publicUrl}
              alt={`${property.name} cover photo`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
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
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <BedDouble className="h-4 w-4" />
              {property.bedrooms} bed
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {property.bathrooms} bath
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {property.max_guests} guests
            </span>
          </div>
          <Badge variant="secondary">
            ${property.nightly_rate.toLocaleString()}/night
          </Badge>
        </CardContent>
      </Card>
    </Link>
  )
}
