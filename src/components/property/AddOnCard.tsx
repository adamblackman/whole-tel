import Image from 'next/image'
import { PartyPopper } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface AddOnCardProps {
  addOn: {
    id: string
    name: string
    description: string | null
    photo_url?: string | null
  }
}

export function AddOnCard({ addOn }: AddOnCardProps) {
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {addOn.photo_url && (
        <div className="relative aspect-video w-full">
          <Image
            src={addOn.photo_url}
            alt={addOn.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}

      <CardHeader className={addOn.photo_url ? 'pb-3 pt-3' : ''}>
        <div className="flex items-center gap-2">
          <PartyPopper className="h-5 w-5 text-brand-amber shrink-0" />
          <CardTitle className="text-base">{addOn.name}</CardTitle>
        </div>
        {addOn.description && (
          <CardDescription className="mt-1">{addOn.description}</CardDescription>
        )}
      </CardHeader>
    </Card>
  )
}
