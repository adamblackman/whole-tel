'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface AddEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  time: string
  timezone: string
  onAdd: (event: {
    title: string
    eventDate: string
    startTime: string
    endTime: string
    notes?: string
  }) => void
}

export function AddEventDialog({
  open,
  onOpenChange,
  date,
  time,
  onAdd,
}: AddEventDialogProps) {
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState(date)
  const [startTime, setStartTime] = useState(time)
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  // Reset form when dialog opens with new date/time
  const handleOpenChange = (val: boolean) => {
    if (val) {
      setTitle('')
      setEventDate(date)
      setStartTime(time)
      setEndTime('')
      setNotes('')
      setError('')
    }
    onOpenChange(val)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (!endTime) {
      setError('End time is required.')
      return
    }
    if (endTime <= startTime) {
      setError('End time must be after start time.')
      return
    }

    onAdd({
      title: title.trim(),
      eventDate,
      startTime,
      endTime,
      notes: notes.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Title *</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pool party, Sunset dinner"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-date">Date</Label>
            <Input
              id="event-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-time">Start time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-time">End time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details..."
              maxLength={500}
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Event</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
