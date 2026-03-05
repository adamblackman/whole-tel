'use client'

import { useState, useTransition } from 'react'
import { createBookingAndCheckout } from '@/lib/actions/bookings'
import type { DateRange } from 'react-day-picker'
import { Minus, Plus } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

interface AddOnItem {
  id: string
  name: string
  description: string | null
  price: number
  pricing_unit: 'per_person' | 'per_booking'
}

interface PricingWidgetProps {
  nightlyRate: number
  cleaningFee: number
  maxGuests: number
  disabledDates: { from: Date; to: Date }[]
  addOns: AddOnItem[]
  propertyId: string
}

export function PricingWidget({
  nightlyRate,
  cleaningFee,
  maxGuests,
  disabledDates,
  addOns,
  propertyId,
}: PricingWidgetProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [guestCount, setGuestCount] = useState(1)
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const nights =
    dateRange?.from && dateRange?.to
      ? Math.ceil(
          (dateRange.to.getTime() - dateRange.from.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0

  const subtotal = nights * nightlyRate

  const addOnsTotal = addOns
    .filter((a) => selectedAddOnIds.has(a.id))
    .reduce((sum, a) => {
      const cost = a.pricing_unit === 'per_person' ? a.price * guestCount : a.price
      return sum + cost
    }, 0)

  const baseAmount = subtotal + (nights > 0 ? cleaningFee : 0) + addOnsTotal
  const processingFee =
    nights > 0 ? parseFloat((baseAmount * 0.029 + 0.3).toFixed(2)) : 0

  const total = subtotal + (nights > 0 ? cleaningFee : 0) + addOnsTotal + processingFee
  const perPerson = guestCount > 1 && nights > 0 ? total / guestCount : null

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
          selectedAddOnIds: Array.from(selectedAddOnIds),
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const toggleAddOn = (id: string) => {
    setSelectedAddOnIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
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

      {/* Add-on experience toggles */}
      {addOns.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Experiences</p>
          <div className="space-y-2">
            {addOns.map((addOn) => {
              const isSelected = selectedAddOnIds.has(addOn.id)
              const unitLabel = addOn.pricing_unit === 'per_person' ? '/person' : '/booking'
              return (
                <button
                  key={addOn.id}
                  type="button"
                  onClick={() => toggleAddOn(addOn.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? 'border-brand-teal bg-brand-teal/5'
                      : 'border-border hover:border-brand-teal/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{addOn.name}</span>
                    <span className="text-sm font-medium shrink-0 ml-2">
                      ${addOn.price.toLocaleString()}
                      <span className="text-xs font-normal text-muted-foreground">
                        {unitLabel}
                      </span>
                    </span>
                  </div>
                  {addOn.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {addOn.description}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Price breakdown */}
      {nights > 0 ? (
        <div className="mt-4 space-y-3">
          <Separator />
          <div className="flex justify-between text-sm">
            <span>
              ${nightlyRate.toLocaleString()} &times; {nights} night{nights !== 1 ? 's' : ''}
            </span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Cleaning fee</span>
            <span>${cleaningFee.toLocaleString()}</span>
          </div>
          {addOns
            .filter((a) => selectedAddOnIds.has(a.id))
            .map((a) => {
              const cost =
                a.pricing_unit === 'per_person' ? a.price * guestCount : a.price
              const unitNote =
                a.pricing_unit === 'per_person' ? ` x ${guestCount}` : ''
              return (
                <div key={a.id} className="flex justify-between text-sm">
                  <span>
                    {a.name}
                    {unitNote && (
                      <span className="text-muted-foreground">{unitNote}</span>
                    )}
                  </span>
                  <span>${cost.toLocaleString()}</span>
                </div>
              )
            })}
          <div className="flex justify-between text-sm">
            <span>Processing fee (card payments)</span>
            <span>${processingFee.toLocaleString()}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>${total.toLocaleString()}</span>
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

      {/* Reserve button — wired to createBookingAndCheckout Server Action */}
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
      <Button
        onClick={handleReserve}
        disabled={isPending || nights < 1}
        className="w-full mt-4"
      >
        {isPending ? 'Redirecting to checkout…' : 'Reserve'}
      </Button>
    </div>
  )
}
