'use client'

import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'

interface PricingWidgetProps {
  nightlyRate: number
  cleaningFee: number
  maxGuests: number
  disabledDates: { from: Date; to: Date }[]
}

export function PricingWidget({
  nightlyRate,
  cleaningFee,
  disabledDates,
}: PricingWidgetProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const nights =
    dateRange?.from && dateRange?.to
      ? Math.ceil(
          (dateRange.to.getTime() - dateRange.from.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0

  const subtotal = nights * nightlyRate
  const total = subtotal + (nights > 0 ? cleaningFee : 0)

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
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total before taxes</span>
            <span>${total.toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Select dates for pricing</p>
      )}
    </div>
  )
}
