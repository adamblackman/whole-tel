'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { createActivity, updateActivity, deleteActivity } from '@/lib/actions/activities'
import type { PropertyActivity, TimeSlot } from '@/types/database'
import type { ActivityInput } from '@/lib/validations/activity'

interface ActivityEditorProps {
  propertyId: string
  initialActivities: PropertyActivity[]
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}hr`
  return `${h}hr ${m}min`
}

function formatTime12h(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

const EMPTY_SLOT: TimeSlot = { start: '', end: '' }

const DEFAULT_FORM = {
  name: '',
  description: '',
  duration_min: 60,
  available_slots: [{ ...EMPTY_SLOT }] as TimeSlot[],
}

export function ActivityEditor({ propertyId, initialActivities }: ActivityEditorProps) {
  const [activities, setActivities] = useState<PropertyActivity[]>(initialActivities)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openCreate() {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(activity: PropertyActivity) {
    setEditingId(activity.id)
    setForm({
      name: activity.name,
      description: activity.description ?? '',
      duration_min: activity.duration_min,
      available_slots: activity.available_slots.length > 0 ? [...activity.available_slots] : [{ ...EMPTY_SLOT }],
    })
    setFormError(null)
    setDialogOpen(true)
  }

  function handleSlotChange(index: number, field: 'start' | 'end', value: string) {
    setForm((prev) => {
      const slots = [...prev.available_slots]
      slots[index] = { ...slots[index], [field]: value }
      return { ...prev, available_slots: slots }
    })
  }

  function addSlot() {
    setForm((prev) => ({
      ...prev,
      available_slots: [...prev.available_slots, { ...EMPTY_SLOT }],
    }))
  }

  function removeSlot(index: number) {
    setForm((prev) => ({
      ...prev,
      available_slots: prev.available_slots.filter((_, i) => i !== index),
    }))
  }

  function handleSave() {
    setFormError(null)
    const input: ActivityInput = {
      name: form.name,
      description: form.description || undefined,
      duration_min: Number(form.duration_min),
      available_slots: form.available_slots,
    }
    startTransition(async () => {
      if (editingId) {
        const result = await updateActivity(editingId, propertyId, input)
        if (result.error) {
          setFormError(result.error)
          return
        }
        setActivities((prev) =>
          prev.map((a) =>
            a.id === editingId
              ? { ...a, name: input.name, description: input.description ?? null, duration_min: input.duration_min, available_slots: input.available_slots, updated_at: new Date().toISOString() }
              : a
          )
        )
      } else {
        const result = await createActivity(propertyId, input)
        if (result.error) {
          setFormError(result.error)
          return
        }
        // Add to list with temporary data (server revalidation will refresh on next page load)
        setActivities((prev) => [
          ...prev,
          {
            id: result.id!,
            property_id: propertyId,
            name: input.name,
            description: input.description ?? null,
            duration_min: input.duration_min,
            available_slots: input.available_slots,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
      }
      setDialogOpen(false)
    })
  }

  function handleDelete(activityId: string) {
    if (!window.confirm('Delete this activity? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteActivity(activityId, propertyId)
      if (result.error) {
        alert(result.error)
        return
      }
      setActivities((prev) => prev.filter((a) => a.id !== activityId))
    })
  }

  return (
    <section className="space-y-5">
      <Separator />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activities</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" onClick={openCreate}>
              Add Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="activity-name">Name *</Label>
                <Input
                  id="activity-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Sunset Kayak Tour"
                  maxLength={100}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="activity-description">Description</Label>
                <Textarea
                  id="activity-description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description for guests"
                  rows={2}
                  maxLength={500}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="activity-duration">Duration (minutes) *</Label>
                <Input
                  id="activity-duration"
                  type="number"
                  min={15}
                  max={1440}
                  value={form.duration_min}
                  onChange={(e) => setForm((prev) => ({ ...prev, duration_min: Number(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Available Time Slots *</Label>
                {form.available_slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      <div className="flex-1 space-y-0.5">
                        <Input
                          type="time"
                          value={slot.start}
                          onChange={(e) => handleSlotChange(i, 'start', e.target.value)}
                          aria-label={`Slot ${i + 1} start time`}
                        />
                        {slot.start && (
                          <p className="text-xs text-muted-foreground pl-1">{formatTime12h(slot.start)}</p>
                        )}
                      </div>
                      <span className="text-muted-foreground text-sm">to</span>
                      <div className="flex-1 space-y-0.5">
                        <Input
                          type="time"
                          value={slot.end}
                          onChange={(e) => handleSlotChange(i, 'end', e.target.value)}
                          aria-label={`Slot ${i + 1} end time`}
                        />
                        {slot.end && (
                          <p className="text-xs text-muted-foreground pl-1">{formatTime12h(slot.end)}</p>
                        )}
                      </div>
                    </div>
                    {form.available_slots.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlot(i)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addSlot}>
                  + Add Slot
                </Button>
              </div>

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleSave} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Activity'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No activities yet. Add activities that guests can book for their stay.
        </p>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="space-y-0.5">
                <p className="font-medium text-sm">{activity.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(activity.duration_min)} &middot; {activity.available_slots.map((s) => `${formatTime12h(s.start)}–${formatTime12h(s.end)}`).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(activity)}
                  disabled={isPending}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(activity.id)}
                  disabled={isPending}
                  className="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
