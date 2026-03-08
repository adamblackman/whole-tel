'use client'

import { useState, type ReactNode } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { BookingDetails } from './BookingDetails'

interface BookingAddOnRow {
  id: string
  add_on_id: string
  quantity: number
  unit_price: number
  total_price: number
  add_ons: { name: string } | { name: string }[] | null
}

interface InvitationRow {
  id: string
  email: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

interface BookingCardClientProps {
  bookingId: string
  checkIn: string
  checkOut: string
  guestCount: number
  subtotal: number
  addOnsTotal: number
  processingFee: number
  total: number
  status: string
  maxGuests: number
  bookingAddOns: BookingAddOnRow[]
  invitations: InvitationRow[]
  header: ReactNode
}

export function BookingCardClient({
  bookingId,
  checkIn,
  checkOut,
  guestCount,
  subtotal,
  addOnsTotal,
  processingFee,
  total,
  status,
  maxGuests,
  bookingAddOns,
  invitations,
  header,
}: BookingCardClientProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full text-left cursor-pointer"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">{header}</div>
            <div className="pt-1 shrink-0">
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <BookingDetails
          bookingId={bookingId}
          checkIn={checkIn}
          checkOut={checkOut}
          guestCount={guestCount}
          subtotal={subtotal}
          addOnsTotal={addOnsTotal}
          processingFee={processingFee}
          total={total}
          status={status}
          maxGuests={maxGuests}
          bookingAddOns={bookingAddOns}
          invitations={invitations}
        />
      </CollapsibleContent>
    </Collapsible>
  )
}
