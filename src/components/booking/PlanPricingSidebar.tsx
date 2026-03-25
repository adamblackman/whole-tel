'use client'

import { useTransition, useState } from 'react'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { calculatePricing, type PricingInput } from '@/lib/pricing'
import { checkoutBooking } from '@/lib/actions/bookings'

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
    <div className="rounded-xl border p-6 shadow-sm space-y-4">
      <h3 className="text-lg font-semibold">Price Breakdown</h3>

      <div className="space-y-3">
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
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Experiences
            </p>
            {breakdown.addOnItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name}</span>
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
  )
}
