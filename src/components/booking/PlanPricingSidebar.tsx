'use client'

import { useTransition, useState } from 'react'
import Image from 'next/image'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Clock, PartyPopper, Check } from 'lucide-react'
import { calculatePricing, type PricingInput } from '@/lib/pricing'
import { checkoutBooking } from '@/lib/actions/bookings'
import type { AddOn } from '@/types/database'

interface PlanPricingSidebarProps {
  bookingId: string
  nights: number
  nightlyRate: number
  cleaningFee: number
  guestCount: number
  guestThreshold: number | null
  perPersonRate: number | null
  taxRate: number | null
  selectedAddOns: PricingInput['selectedAddOns']
  activities: AddOn[]
  selectedActivityIds: string[]
  activityCounts: Record<string, number>
}

function formatPrice(price: number, unit: string): string {
  const formatted = `$${price.toLocaleString()}`
  return unit === 'per_person' ? `${formatted}/person` : formatted
}

export function PlanPricingSidebar({
  bookingId,
  nights,
  nightlyRate,
  cleaningFee,
  guestCount,
  guestThreshold,
  perPersonRate,
  taxRate,
  selectedAddOns,
  activities,
  selectedActivityIds,
  activityCounts,
}: PlanPricingSidebarProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const breakdown = calculatePricing({
    nightlyRate,
    cleaningFee,
    nights,
    guestCount,
    guestThreshold,
    perPersonRate,
    taxRate,
    selectedAddOns,
  })

  const handleCheckout = () => {
    setError(null)
    startTransition(async () => {
      try {
        await checkoutBooking(bookingId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Available Experiences */}
      {activities.length > 0 && (
        <div className="rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <PartyPopper className="h-4 w-4 text-brand-amber" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Available Experiences
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Click a time slot on the calendar to add these to your trip.
          </p>

          <div className="space-y-3">
            {activities.map((activity) => {
              const isAdded = selectedActivityIds.includes(activity.id)

              return (
                <div
                  key={activity.id}
                  className={`relative rounded-lg border p-3 transition-all ${
                    isAdded
                      ? 'border-brand-teal/40 bg-brand-teal/5'
                      : 'border-border'
                  }`}
                >
                  {/* Added indicator with count */}
                  {isAdded && (
                    <div className="absolute -top-1.5 -right-1.5 bg-brand-teal text-white rounded-full flex items-center gap-0.5 px-1.5 py-0.5">
                      <Check className="h-3 w-3" />
                      {(activityCounts[activity.id] ?? 0) > 1 && (
                        <span className="text-[10px] font-bold leading-none">
                          &times;{activityCounts[activity.id]}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    {/* Photo thumbnail */}
                    {activity.photo_url && (
                      <div className="relative h-14 w-14 rounded-md overflow-hidden shrink-0">
                        <Image
                          src={activity.photo_url}
                          alt={activity.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight truncate">
                          {activity.name}
                        </p>
                        <span className="text-sm font-semibold text-brand-teal whitespace-nowrap">
                          {formatPrice(Number(activity.price), activity.pricing_unit)}
                        </span>
                      </div>

                      {activity.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {activity.description}
                        </p>
                      )}

                      {activity.duration_min && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {activity.duration_min} min
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Price Breakdown + Checkout */}
      <div className="rounded-xl border p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Price Breakdown
        </h3>

        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span>
              ${nightlyRate.toLocaleString()} &times; {nights} night{nights !== 1 ? 's' : ''}
            </span>
            <span>${breakdown.accommodationSubtotal.toLocaleString()}</span>
          </div>

          {breakdown.perPersonSurcharge > 0 && breakdown.surchargeDetail && (
            <div className="flex justify-between text-sm">
              <span>
                Per-person surcharge ({breakdown.surchargeDetail.extraGuests} extra)
              </span>
              <span>${breakdown.perPersonSurcharge.toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span>Cleaning fee</span>
            <span>${cleaningFee.toLocaleString()}</span>
          </div>

          {breakdown.addOnItems.length > 0 && (
            <>
              <Separator />
              {breakdown.addOnItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-brand-teal" />
                    {item.name}
                  </span>
                  <span>${item.totalCost.toLocaleString()}</span>
                </div>
              ))}
            </>
          )}

          {breakdown.hotelTax > 0 && breakdown.taxRate != null && (
            <div className="flex justify-between text-sm">
              <span>Hotel Tax ({(breakdown.taxRate * 100).toFixed(0)}%)</span>
              <span>${breakdown.hotelTax.toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span>Processing fee</span>
            <span>${breakdown.processingFee.toLocaleString()}</span>
          </div>

          <Separator />

          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>${breakdown.total.toLocaleString()}</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          onClick={handleCheckout}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? 'Redirecting to checkout...' : 'Proceed to Checkout'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Experiences are optional — you can check out with just the villa.
        </p>
      </div>
    </div>
  )
}
