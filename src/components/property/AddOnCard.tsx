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
  }
}

export function AddOnCard({ addOn }: AddOnCardProps) {
  const priceLabel =
    addOn.pricing_unit === 'per_person'
      ? `$${addOn.price.toLocaleString()} / person`
      : `$${addOn.price.toLocaleString()} / booking`

  const badgeLabel = addOn.pricing_unit === 'per_person' ? 'Per Person' : 'Per Booking'

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-brand-amber shrink-0" />
            <CardTitle className="text-base">{addOn.name}</CardTitle>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {badgeLabel}
          </Badge>
        </div>
        {addOn.description && (
          <CardDescription className="mt-1">{addOn.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold text-foreground">{priceLabel}</p>
      </CardContent>
    </Card>
  )
}
