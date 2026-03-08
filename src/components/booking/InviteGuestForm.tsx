'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'
import { sendInvitation } from '@/lib/actions/booking-invitations'

interface InviteGuestFormProps {
  bookingId: string
}

export function InviteGuestForm({ bookingId }: InviteGuestFormProps) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' })
      return
    }

    startTransition(async () => {
      const result = await sendInvitation({ bookingId, email: trimmed })
      if (result.success) {
        setEmail('')
        setMessage({ type: 'success', text: 'Invitation sent!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Failed to send invitation' })
      }
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Invite a guest</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="guest@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
          <Send className="h-3.5 w-3.5" />
          {isPending ? 'Sending...' : 'Send Invite'}
        </Button>
      </form>
      {message && (
        <p
          className={`text-xs ${
            message.type === 'success' ? 'text-green-600' : 'text-destructive'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
