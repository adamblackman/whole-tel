'use client'

import { useState } from 'react'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Pencil, Users, Clock, Calendar } from 'lucide-react'
import { GuestCountEditor } from './GuestCountEditor'
import { InviteGuestForm } from './InviteGuestForm'
import { GuestList } from './GuestList'
import { PaymentDeadlineCountdown } from './PaymentDeadlineCountdown'
import { ManualAttendeeForm } from './ManualAttendeeForm'
import type { InvitationStatus } from '@/types/database'

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
  status: InvitationStatus
  created_at: string
  full_name: string | null
  phone: string | null
}

interface BookingDetailsProps {
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
}

function formatCurrency(dollars: number) {
  return `$${Number(dollars).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDeadlineDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function BookingDetails({
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
}: BookingDetailsProps) {
  const [isEditingGuests, setIsEditingGuests] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)

  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / 86400000
  )

  const isExpired = status === 'expired'

  return (
    <div className="pt-4 space-y-4">
      <Separator />

      {/* Expired banner */}
      {isExpired && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-800 font-medium">
            This booking has expired. The payment deadline has passed.
          </p>
        </div>
      )}

      {/* Payment deadline countdown for pending bookings */}
      {status === 'pending' && paymentDeadline && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <PaymentDeadlineCountdown deadline={paymentDeadline} />
          {stripeCheckoutUrl && (
            <a
              href={stripeCheckoutUrl}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors shrink-0"
            >
              <Clock className="h-3 w-3" />
              Complete Payment
            </a>
          )}
        </div>
      )}

      {/* Activity deadline */}
      {activityDeadline && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>
            Activity booking deadline:{' '}
            <span className="font-medium text-foreground">
              {formatDeadlineDate(activityDeadline)}
            </span>
          </span>
        </div>
      )}

      {/* Guest count with edit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>
            {guestCount} {guestCount === 1 ? 'guest' : 'guests'} &middot;{' '}
            {nights} {nights === 1 ? 'night' : 'nights'}
          </span>
        </div>
        {status === 'confirmed' && !isEditingGuests && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setIsEditingGuests(true)}
          >
            <Pencil className="h-3 w-3" />
            Edit guests
          </Button>
        )}
      </div>

      {isEditingGuests && (
        <GuestCountEditor
          bookingId={bookingId}
          currentCount={guestCount}
          maxGuests={maxGuests}
          onClose={() => setIsEditingGuests(false)}
        />
      )}

      <Separator />

      {/* Price breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Accommodation</span>
          <span>{formatCurrency(Number(subtotal))}</span>
        </div>

        {bookingAddOns.length > 0 && (
          <>
            {bookingAddOns.map((ba) => {
              const addOn = Array.isArray(ba.add_ons)
                ? ba.add_ons[0]
                : ba.add_ons
              return (
                <div key={ba.id} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {addOn?.name ?? 'Add-on'}
                  </span>
                  <span>{formatCurrency(Number(ba.total_price))}</span>
                </div>
              )
            })}
          </>
        )}

        <div className="flex justify-between">
          <span className="text-muted-foreground">Processing fee</span>
          <span>{formatCurrency(Number(processingFee))}</span>
        </div>

        <Separator />

        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatCurrency(Number(total))}</span>
        </div>
      </div>

      {/* Guest invitations -- only for confirmed bookings */}
      {status === 'confirmed' && (
        <>
          <Separator />
          <GuestList invitations={invitations} />
          <InviteGuestForm bookingId={bookingId} />

          {/* Manual attendee entry */}
          {!showManualForm ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setShowManualForm(true)}
            >
              Add manually
            </Button>
          ) : (
            <ManualAttendeeForm
              bookingId={bookingId}
              onClose={() => setShowManualForm(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
