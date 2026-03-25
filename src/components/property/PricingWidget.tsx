'use client'

import { useState, useTransition } from 'react'
import { createBookingAndCheckout } from '@/lib/actions/bookings'
import { calculatePricing } from '@/lib/pricing'
import type { DateRange } from 'react-day-picker'
import { Minus, Plus } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

interface PricingWidgetProps {
  nightlyRate: number
  cleaningFee: number
  maxGuests: number
  guestThreshold: number | null
  perPersonRate: number | null
  taxRate: number | null
  disabledDates: { from: Date; to: Date }[]
  propertyId: string
}

export function PricingWidget({
  nightlyRate,
  cleaningFee,
  maxGuests,
  guestThreshold,
  perPersonRate,
  taxRate,
  disabledDates,
  propertyId,
}: PricingWidgetProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [guestCount, setGuestCount] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const nights =
    dateRange?.from && dateRange?.to
      ? Math.ceil(
          (dateRange.to.getTime() - dateRange.from.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0

  const breakdown = calculatePricing({
    nightlyRate,
    cleaningFee,
    nights,
    guestCount,
    guestThreshold,
    perPersonRate,
    taxRate,
    selectedAddOns: [],
  })

  const perPerson = guestCount > 1 && nights > 0 ? breakdown.total / guestCount : null

  const handleReserve = () => {
    if (!dateRange?.from || !dateRange?.to) return
    setError(null)

    startTransition(async () => {
      try {
        await createBookingAndCheckout({
          propertyId,
          checkIn: dateRange.from!.toISOString().slice(0, 10),
          checkOut: dateRange.to!.toISOString().slice(0, 10),
          guestCount,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="rounded-xl border p-6 shadow-sm">
      {/* Rate display */}
      <p className="text-2xl font-bold">
        ${nightlyRate.toLocaleString()}{' '}
        <span className="text-base font-normal text-muted-foreground">/ night</span>
      </p>

      {/* Availability calendar */}
      <div className="mt-4">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={setDateRange}
          disabled={[{ before: new Date() }, ...disabledDates]}
          numberOfMonths={1}
          className="rounded-md border"
        />
      </div>

      {/* Guest count picker */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm font-medium">Guests</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
            disabled={guestCount <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{guestCount}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setGuestCount((c) => Math.min(maxGuests, c + 1))}
            disabled={guestCount >= maxGuests}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-right mt-1">Max {maxGuests} guests</p>

      {/* Price breakdown */}
      {nights > 0 ? (
        <div className="mt-4 space-y-3">
          <Separator />
          <div className="flex justify-between text-sm">
            <span>
              ${nightlyRate.toLocaleString()} &times; {nights} night{nights !== 1 ? 's' : ''}
            </span>
            <span>${breakdown.accommodationSubtotal.toLocaleString()}</span>
          </div>
          {breakdown.perPersonSurcharge > 0 && breakdown.surchargeDetail && (
            <div className="flex justify-between text-sm">
              <span>
                Per-person surcharge ({breakdown.surchargeDetail.extraGuests} guest{breakdown.surchargeDetail.extraGuests !== 1 ? 's' : ''} above {guestThreshold})
                <span className="text-muted-foreground"> &mdash; ${breakdown.surchargeDetail.ratePerNight}/night</span>
              </span>
              <span>${breakdown.perPersonSurcharge.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>Cleaning fee</span>
            <span>${cleaningFee.toLocaleString()}</span>
          </div>
          {breakdown.hotelTax > 0 && breakdown.taxRate != null && (
            <div className="flex justify-between text-sm">
              <span>Hotel Tax ({(breakdown.taxRate * 100).toFixed(0)}%)</span>
              <span>${breakdown.hotelTax.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>Processing fee (card payments)</span>
            <span>${breakdown.processingFee.toLocaleString()}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>${breakdown.total.toLocaleString()}</span>
          </div>
          {perPerson !== null && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Per person ({guestCount} guests)</span>
              <span>${perPerson.toFixed(2)}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Select dates for pricing</p>
      )}

      {/* Reserve button */}
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
      <Button
        onClick={handleReserve}
        disabled={isPending || nights < 1}
        className="w-full mt-4"
      >
        {isPending ? 'Redirecting to checkout...' : 'Reserve'}
      </Button>
    </div>
  )
}
