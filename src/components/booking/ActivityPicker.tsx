'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { PropertyActivity } from '@/types/database'

interface ActivityPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activities: PropertyActivity[]
  date: string
  timezone: string
  onAdd: (event: {
    activityId: string
    title: string
    eventDate: string
    startTime: string
    endTime: string
  }) => void
}

function formatTime(hhmm: string): string {
  const [hourStr, minuteStr] = hhmm.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = minuteStr ?? '00'
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${minute} ${period}`
}

/** Add durationMin minutes to HH:MM, capped by slotEnd (also HH:MM) */
function addMinutes(hhmm: string, durationMin: number, cap: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const totalMinutes = h * 60 + m + durationMin
  const capMinutes = parseInt(cap.split(':')[0], 10) * 60 + parseInt(cap.split(':')[1], 10)
  const clamped = Math.min(totalMinutes, capMinutes)
  const rh = Math.floor(clamped / 60)
  const rm = clamped % 60
  return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`
}

export function ActivityPicker({
  open,
  onOpenChange,
  activities,
  date,
  onAdd,
}: ActivityPickerProps) {
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)

  const handleOpenChange = (val: boolean) => {
    if (!val) setSelectedActivityId(null)
    onOpenChange(val)
  }

  const selectedActivity = activities.find((a) => a.id === selectedActivityId) ?? null

  const handleSlotClick = (slotStart: string, slotEnd: string) => {
    if (!selectedActivity) return
    const endTime = addMinutes(slotStart, selectedActivity.duration_min, slotEnd)
    onAdd({
      activityId: selectedActivity.id,
      title: selectedActivity.name,
      eventDate: date,
      startTime: slotStart,
      endTime,
    })
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Property Activity</DialogTitle>
        </DialogHeader>

        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No activities available for this property.
          </p>
        ) : !selectedActivity ? (
          <div className="space-y-2 mt-2">
            <p className="text-sm text-muted-foreground mb-3">
              Select an activity to see available time slots.
            </p>
            {activities.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => setSelectedActivityId(activity.id)}
                className="w-full text-left rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <p className="font-medium text-sm">{activity.name}</p>
                {activity.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activity.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Duration: {activity.duration_min} min &middot;{' '}
                  {activity.available_slots.length} time slot
                  {activity.available_slots.length !== 1 ? 's' : ''} available
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedActivity.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedActivity.duration_min} min
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedActivityId(null)}
              >
                &larr; Back
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">Choose a time slot:</p>

            {selectedActivity.available_slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No time slots configured for this activity.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {selectedActivity.available_slots.map((slot, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSlotClick(slot.start, slot.end)}
                    className="rounded-lg border p-2.5 text-sm hover:bg-accent transition-colors text-center"
                  >
                    {formatTime(slot.start)} &ndash; {formatTime(slot.end)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
