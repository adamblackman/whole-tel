'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, CalendarPlus } from 'lucide-react'
import { BookingDetails } from './BookingDetails'
import { SplitPaymentEditor } from './SplitPaymentEditor'

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
  full_name: string | null
  phone: string | null
}

interface SplitRow {
  invitationId: string
  amount: number
  paymentStatus: 'unpaid' | 'paid'
  stripePaymentLinkUrl: string | null
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
  paymentDeadline: string | null
  activityDeadline: string | null
  stripeCheckoutUrl: string | null
  splits: SplitRow[]
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
  paymentDeadline,
  activityDeadline,
  stripeCheckoutUrl,
  splits,
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
          paymentDeadline={paymentDeadline}
          activityDeadline={activityDeadline}
          stripeCheckoutUrl={stripeCheckoutUrl}
        />
        {status === 'pending' && (
          <div className="pt-3">
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" asChild>
              <Link href={`/bookings/${bookingId}/plan`}>
                <CalendarPlus className="h-3.5 w-3.5" />
                Continue Planning
              </Link>
            </Button>
          </div>
        )}
        {status === 'confirmed' && (
          <div className="pt-3">
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" asChild>
              <Link href={`/bookings/${bookingId}/itinerary`}>
                <CalendarPlus className="h-3.5 w-3.5" />
                {activityDeadline && new Date() > new Date(activityDeadline)
                  ? 'View Itinerary'
                  : 'Plan Itinerary'}
              </Link>
            </Button>
          </div>
        )}
        {status === 'confirmed' &&
          invitations.some((inv) => inv.status === 'accepted') && (
            <SplitPaymentEditor
              bookingId={bookingId}
              total={total}
              attendees={invitations
                .filter((inv) => inv.status === 'accepted')
                .map((inv) => ({
                  invitationId: inv.id,
                  name: inv.full_name ?? '',
                  email: inv.email,
                }))}
              existingSplits={splits}
            />
          )}
      </CollapsibleContent>
    </Collapsible>
  )
}
