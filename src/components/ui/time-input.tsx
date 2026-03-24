'use client'

import { useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TimeInputProps {
  value: string // HH:MM (24h)
  onChange: (value: string) => void
  'aria-label'?: string
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = ['00', '15', '30', '45']

function parse24h(value: string): { hour: string; minute: string; period: string } {
  if (!value || !value.includes(':')) return { hour: '', minute: '', period: 'AM' }
  const [h, m] = value.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return {
    hour: String(hour12),
    minute: String(m).padStart(2, '0'),
    period,
  }
}

function to24h(hour: string, minute: string, period: string): string {
  if (!hour || !minute) return ''
  let h = parseInt(hour, 10)
  if (period === 'AM' && h === 12) h = 0
  if (period === 'PM' && h !== 12) h += 12
  return `${String(h).padStart(2, '0')}:${minute}`
}

export function TimeInput({ value, onChange, 'aria-label': ariaLabel }: TimeInputProps) {
  const { hour, minute, period } = parse24h(value)

  const update = useCallback(
    (field: 'hour' | 'minute' | 'period', val: string) => {
      const next = {
        hour: field === 'hour' ? val : hour || '12',
        minute: field === 'minute' ? val : minute || '00',
        period: field === 'period' ? val : period || 'AM',
      }
      onChange(to24h(next.hour, next.minute, next.period))
    },
    [hour, minute, period, onChange]
  )

  return (
    <div className="flex items-center gap-1" aria-label={ariaLabel}>
      {/* Hour */}
      <Select value={hour} onValueChange={(v) => update('hour', v)}>
        <SelectTrigger className="w-[4.25rem] px-2 text-center">
          <SelectValue placeholder="Hr" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-muted-foreground font-medium">:</span>

      {/* Minute */}
      <Select value={minute} onValueChange={(v) => update('minute', v)}>
        <SelectTrigger className="w-[4.25rem] px-2 text-center">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* AM/PM */}
      <Select value={period} onValueChange={(v) => update('period', v)}>
        <SelectTrigger className="w-[4.5rem] px-2 text-center">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
