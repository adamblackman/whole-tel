'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface PaymentDeadlineCountdownProps {
  deadline: string
}

export function PaymentDeadlineCountdown({ deadline }: PaymentDeadlineCountdownProps) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    if (remaining <= 0) return

    const interval = setInterval(() => {
      const next = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000))
      setRemaining(next)
    }, 1000)

    return () => clearInterval(interval)
  }, [deadline, remaining])

  if (remaining <= 0) {
    return (
      <span className="flex items-center gap-1.5 text-destructive text-sm">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        Payment window expired
      </span>
    )
  }

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60

  return (
    <span className="flex items-center gap-1.5 text-amber-600 text-sm font-medium tabular-nums">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      {hours}h {String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s remaining
    </span>
  )
}
