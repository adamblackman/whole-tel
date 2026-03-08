import Image from 'next/image'
import { PartyPopper } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AddOnCardProps {
  addOn: {
    id: string
    name: string
    description: string | null
    price: number
    pricing_unit: 'per_person' | 'per_booking'
    included_guests?: number | null
    per_person_above?: number | null
    photo_url?: string | null
  }
}

export function AddOnCard({ addOn }: AddOnCardProps) {
  const hasTier = addOn.included_guests != null && addOn.per_person_above != null

  const priceLabel = hasTier
    ? `$${addOn.price.toLocaleString()}`
    : addOn.pricing_unit === 'per_person'
      ? `$${addOn.price.toLocaleString()} / person`
      : `$${addOn.price.toLocaleString()} / booking`

  const badgeLabel = hasTier
    ? 'Tiered'
    : addOn.pricing_unit === 'per_person'
      ? 'Per Person'
      : 'Per Booking'

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {/* Hero image when photo exists */}
      {addOn.photo_url && (
        <div className="relative aspect-video w-full">
          <Image
            src={addOn.photo_url}
            alt={addOn.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm shadow-sm">
              {badgeLabel}
            </Badge>
          </div>
        </div>
      )}

      <CardHeader className={addOn.photo_url ? 'pb-2 pt-3' : 'pb-2'}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-brand-amber shrink-0" />
            <CardTitle className="text-base">{addOn.name}</CardTitle>
          </div>
          {/* Only show badge here when there's no hero image (badge is on the image instead) */}
          {!addOn.photo_url && (
            <Badge variant="secondary" className="shrink-0">
              {badgeLabel}
            </Badge>
          )}
        </div>
        {addOn.description && (
          <CardDescription className="mt-1">{addOn.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="mt-auto">
        <p className="text-lg font-semibold text-foreground">{priceLabel}</p>
        {hasTier && (
          <p className="text-sm text-muted-foreground mt-1">
            Up to {addOn.included_guests} people included, ${addOn.per_person_above}/person above
          </p>
        )}
      </CardContent>
    </Card>
  )
}
