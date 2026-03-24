import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { BookingCardClient } from '@/components/booking/BookingCardClient'

export const metadata: Metadata = {
  title: 'My Bookings — Whole-Tel',
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'confirmed':
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          Confirmed
        </Badge>
      )
    case 'pending':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          Payment pending
        </Badge>
      )
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>
    case 'expired':
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          Expired
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

type BookingAddOnRow = {
  id: string
  add_on_id: string
  quantity: number
  unit_price: number
  total_price: number
  add_ons: { name: string } | { name: string }[] | null
}

type InvitationRow = {
  id: string
  email: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  full_name: string | null
  phone: string | null
}

type BookingRow = {
  id: string
  check_in: string
  check_out: string
  guest_count: number
  subtotal: number
  add_ons_total: number
  processing_fee: number
  total: number
  status: string
  created_at: string
  payment_deadline: string | null
  activity_deadline: string | null
  stripe_checkout_url: string | null
  properties:
    | { id: string; name: string; location: string; max_guests: number }
    | { id: string; name: string; location: string; max_guests: number }[]
    | null
  booking_add_ons: BookingAddOnRow[]
  booking_invitations: InvitationRow[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCurrency(dollars: number) {
  return `$${Number(dollars).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function BookingCard({ booking }: { booking: BookingRow }) {
  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties

  return (
    <Card>
      <CardContent className="p-5">
        <BookingCardClient
          bookingId={booking.id}
          checkIn={booking.check_in}
          checkOut={booking.check_out}
          guestCount={booking.guest_count}
          subtotal={booking.subtotal}
          addOnsTotal={booking.add_ons_total}
          processingFee={booking.processing_fee}
          total={booking.total}
          status={booking.status}
          maxGuests={property ? Number(property.max_guests) : 1}
          bookingAddOns={booking.booking_add_ons ?? []}
          invitations={booking.booking_invitations ?? []}
          paymentDeadline={booking.payment_deadline}
          activityDeadline={booking.activity_deadline}
          stripeCheckoutUrl={booking.stripe_checkout_url}
          header={
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2 min-w-0">
                {property ? (
                  <Link
                    href={`/properties/${property.id}`}
                    className="text-lg font-semibold hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {property.name}
                  </Link>
                ) : (
                  <span className="text-lg font-semibold text-muted-foreground">
                    Property unavailable
                  </span>
                )}

                {property && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{property.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {formatDate(booking.check_in)} &rarr;{' '}
                    {formatDate(booking.check_out)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span>
                    {booking.guest_count}{' '}
                    {booking.guest_count === 1 ? 'guest' : 'guests'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge status={booking.status} />
                <p className="text-xl font-bold">
                  {formatCurrency(booking.total)}
                </p>
                {booking.guest_count > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Per person: {formatCurrency(booking.total / booking.guest_count)}
                  </p>
                )}
              </div>
            </div>
          }
        />
      </CardContent>
    </Card>
  )
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const user = await verifySession()
  const { success } = await searchParams

  const supabase = await createClient()

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, check_in, check_out, guest_count, subtotal, add_ons_total,
      processing_fee, total, status, created_at,
      payment_deadline, activity_deadline, stripe_checkout_url,
      properties(id, name, location, max_guests),
      booking_add_ons(id, add_on_id, quantity, unit_price, total_price, add_ons(name)),
      booking_invitations(id, email, status, created_at, full_name, phone)
    `)
    .eq('guest_id', user.id)
    .order('check_in', { ascending: false })

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = (bookings ?? []).filter(
    (b) => b.check_in >= today
  ) as BookingRow[]
  const past = (bookings ?? []).filter(
    (b) => b.check_in < today
  ) as BookingRow[]

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">My Bookings</h1>

      {success === 'true' && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-sm font-medium text-green-800">
            Booking submitted! You&apos;ll receive a confirmation once payment
            is processed.
          </p>
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No bookings yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            <Link
              href="/properties"
              className="text-brand-teal hover:underline"
            >
              Browse Whole-Tels&trade;
            </Link>{' '}
            to plan your next getaway
          </p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Upcoming</h2>
              <div className="grid gap-4">
                {upcoming.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Past</h2>
              <div className="grid gap-4">
                {past.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
