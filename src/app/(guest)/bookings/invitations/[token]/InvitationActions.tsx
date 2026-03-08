'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'
import { acceptInvitation, declineInvitation } from '@/lib/actions/booking-invitations'
import Link from 'next/link'

interface InvitationActionsProps {
  token: string
}

export function InvitationActions({ token }: InvitationActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{
    type: 'accepted' | 'declined' | 'error'
    message: string
    bookingId?: string
  } | null>(null)

  function handleAccept() {
    startTransition(async () => {
      const res = await acceptInvitation(token)
      if (res.success) {
        setResult({
          type: 'accepted',
          message: 'You have accepted the invitation! You have been added to the guest list.',
          bookingId: res.bookingId,
        })
      } else {
        setResult({ type: 'error', message: res.error ?? 'Failed to accept invitation' })
      }
    })
  }

  function handleDecline() {
    startTransition(async () => {
      const res = await declineInvitation(token)
      if (res.success) {
        setResult({ type: 'declined', message: 'You have declined the invitation.' })
      } else {
        setResult({ type: 'error', message: res.error ?? 'Failed to decline invitation' })
      }
    })
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div
          className={`rounded-lg p-4 ${
            result.type === 'error'
              ? 'bg-red-50 border border-red-200'
              : result.type === 'accepted'
                ? 'bg-green-50 border border-green-200'
                : 'bg-gray-50 border border-gray-200'
          }`}
        >
          <p
            className={`text-sm font-medium ${
              result.type === 'error'
                ? 'text-red-800'
                : result.type === 'accepted'
                  ? 'text-green-800'
                  : 'text-gray-800'
            }`}
          >
            {result.message}
          </p>
        </div>
        {result.type === 'accepted' && (
          <Link href="/bookings">
            <Button className="w-full">View My Bookings</Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <Button
        onClick={handleAccept}
        disabled={isPending}
        className="flex-1 gap-1.5"
      >
        <Check className="h-4 w-4" />
        {isPending ? 'Processing...' : 'Accept'}
      </Button>
      <Button
        variant="outline"
        onClick={handleDecline}
        disabled={isPending}
        className="flex-1 gap-1.5"
      >
        <X className="h-4 w-4" />
        Decline
      </Button>
    </div>
  )
}
