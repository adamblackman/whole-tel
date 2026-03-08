import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'
import { InvitationActions } from './InvitationActions'

export const metadata: Metadata = {
  title: 'Booking Invitation — Whole-Tel',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Fetch invitation with booking and property details (admin client for cross-user access)
  const admin = createAdminClient()
  const { data: invitation } = await admin
    .from('booking_invitations')
    .select('*, bookings(check_in, check_out, properties(name, location))')
    .eq('token', token)
    .single()

  if (!invitation) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <h1 className="text-xl font-semibold">Invitation Not Found</h1>
            <p className="text-sm text-muted-foreground">
              This invitation link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const booking = Array.isArray(invitation.bookings)
    ? invitation.bookings[0]
    : invitation.bookings

  const property = booking
    ? Array.isArray(booking.properties)
      ? booking.properties[0]
      : booking.properties
    : null

  // Check if already responded
  if (invitation.status !== 'pending') {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <h1 className="text-xl font-semibold">
              Invitation Already {invitation.status === 'accepted' ? 'Accepted' : 'Declined'}
            </h1>
            <p className="text-sm text-muted-foreground">
              You have already {invitation.status} this invitation.
            </p>
            {invitation.status === 'accepted' && (
              <Link href="/bookings">
                <Button className="mt-4">View My Bookings</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check auth state -- wrap in try/catch because verifySession redirects if not logged in
  let user = null
  let userEmail: string | null = null
  try {
    user = await verifySession()
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()
    userEmail = profile?.email ?? null
  } catch {
    // Not logged in -- user stays null
  }

  const invitationDetails = (
    <div className="space-y-3">
      {property && (
        <>
          <h2 className="text-lg font-semibold">{property.name}</h2>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{property.location}</span>
          </div>
        </>
      )}
      {booking && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>
            {formatDate(booking.check_in)} &rarr; {formatDate(booking.check_out)}
          </span>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Invited: <span className="font-medium text-foreground">{invitation.email}</span>
      </p>
    </div>
  )

  // Not logged in
  if (!user) {
    const redirectTo = encodeURIComponent(`/bookings/invitations/${token}`)
    return (
      <div className="max-w-md mx-auto py-12">
        <Card>
          <CardContent className="p-8 space-y-6">
            <h1 className="text-xl font-semibold">You&apos;re Invited!</h1>
            {invitationDetails}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sign in or create an account to respond to this invitation.
              </p>
              <div className="flex gap-3">
                <Link href={`/login?return_to=${redirectTo}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    Log in to respond
                  </Button>
                </Link>
                <Link href={`/signup?return_to=${redirectTo}`} className="flex-1">
                  <Button className="w-full">Sign up to respond</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Logged in but email doesn't match
  if (userEmail && userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card>
          <CardContent className="p-8 space-y-6">
            <h1 className="text-xl font-semibold">Email Mismatch</h1>
            {invitationDetails}
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <p className="text-sm text-yellow-800">
                This invitation was sent to{' '}
                <strong>{invitation.email}</strong>. You are logged in as{' '}
                <strong>{userEmail}</strong>.
              </p>
            </div>
            <Link
              href={`/login?return_to=${encodeURIComponent(`/bookings/invitations/${token}`)}&message=${encodeURIComponent('Please sign in with the email address this invitation was sent to.')}`}
            >
              <Button variant="outline" className="w-full">
                Sign in with a different account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Logged in and email matches
  return (
    <div className="max-w-md mx-auto py-12">
      <Card>
        <CardContent className="p-8 space-y-6">
          <h1 className="text-xl font-semibold">You&apos;re Invited!</h1>
          {invitationDetails}
          <InvitationActions token={token} />
        </CardContent>
      </Card>
    </div>
  )
}
