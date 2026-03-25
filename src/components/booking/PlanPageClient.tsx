'use client'

import { useState, useCallback } from 'react'
import { ItineraryCalendar } from './ItineraryCalendar'
import { PlanPricingSidebar } from './PlanPricingSidebar'
import type { ItineraryEvent, AddOn } from '@/types/database'
import type { PricingInput } from '@/lib/pricing'

interface PlanPageClientProps {
  bookingId: string
  checkIn: string
  checkOut: string
  guestCount: number
  timezone: string
  nights: number
  nightlyRate: number
  cleaningFee: number
  guestThreshold: number | null
  perPersonRate: number | null
  taxRate: number | null
  initialEvents: ItineraryEvent[]
  activities: AddOn[]
  allAddOns: PricingInput['selectedAddOns']
}

export function PlanPageClient({
  bookingId,
  checkIn,
  checkOut,
  guestCount,
  timezone,
  nights,
  nightlyRate,
  cleaningFee,
  guestThreshold,
  perPersonRate,
  taxRate,
  initialEvents,
  activities,
  allAddOns,
}: PlanPageClientProps) {
  const initialActivityIds = [
    ...new Set(
      initialEvents
        .map((e) => e.activity_id)
        .filter((id): id is string => id != null)
    ),
  ]

  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>(initialActivityIds)
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>({})

  const handleEventsChange = useCallback((activityIds: string[], allActivityIds: string[]) => {
    setSelectedActivityIds(activityIds)
    const counts: Record<string, number> = {}
    for (const id of allActivityIds) {
      counts[id] = (counts[id] ?? 0) + 1
    }
    setActivityCounts(counts)
  }, [])

  const selectedAddOns = allAddOns.filter((a) => selectedActivityIds.includes(a.id))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
      <ItineraryCalendar
        bookingId={bookingId}
        checkIn={checkIn}
        checkOut={checkOut}
        timezone={timezone}
        initialEvents={initialEvents}
        activities={activities}
        isLocked={false}
        onEventsChange={handleEventsChange}
      />

      <div className="lg:sticky lg:top-8 self-start">
        <PlanPricingSidebar
          bookingId={bookingId}
          nights={nights}
          nightlyRate={nightlyRate}
          cleaningFee={cleaningFee}
          guestCount={guestCount}
          guestThreshold={guestThreshold}
          perPersonRate={perPersonRate}
          taxRate={taxRate}
          selectedAddOns={selectedAddOns}
          activities={activities}
          selectedActivityIds={selectedActivityIds}
          activityCounts={activityCounts}
        />
      </div>
    </div>
  )
}
