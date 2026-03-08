'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Minus, Plus, Loader2 } from 'lucide-react'
import { updateGuestCount } from '@/lib/actions/booking-updates'

interface GuestCountEditorProps {
  bookingId: string
  currentCount: number
  maxGuests: number
  onClose: () => void
}

export function GuestCountEditor({
  bookingId,
  currentCount,
  maxGuests,
  onClose,
}: GuestCountEditorProps) {
  const [count, setCount] = useState(currentCount)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (count === currentCount) {
      onClose()
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        await updateGuestCount({ bookingId, guestCount: count })
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update')
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCount((c) => Math.max(1, c - 1))}
          disabled={count <= 1 || isPending}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-8 text-center text-sm font-medium">{count}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCount((c) => Math.min(maxGuests, c + 1))}
          disabled={count >= maxGuests || isPending}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Button
        size="sm"
        className="h-7 text-xs"
        onClick={handleSave}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={onClose}
        disabled={isPending}
      >
        Cancel
      </Button>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
