'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { addAttendeeManually } from '@/lib/actions/booking-invitations'

interface ManualAttendeeFormProps {
  bookingId: string
  onClose: () => void
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function ManualAttendeeForm({ bookingId, onClose }: ManualAttendeeFormProps) {
  const [isPending, startTransition] = useTransition()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isValid =
    fullName.trim().length >= 2 &&
    isValidEmail(email.trim()) &&
    phone.trim().length >= 7

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    setError(null)
    startTransition(async () => {
      const result = await addAttendeeManually({
        bookingId,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      })

      if (result.success) {
        onClose()
      } else {
        setError(result.error ?? 'Failed to add attendee')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <div className="space-y-1.5">
        <Label htmlFor="manual-full-name">Full name</Label>
        <Input
          id="manual-full-name"
          placeholder="Jane Smith"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={isPending}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="manual-email">Email</Label>
        <Input
          id="manual-email"
          type="email"
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="manual-phone">Phone</Label>
        <Input
          id="manual-phone"
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isPending}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending || !isValid} className="flex-1">
          {isPending ? 'Adding...' : 'Add attendee'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
