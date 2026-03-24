import { z } from 'zod'

// ---------------------------------------------------------------------------
// Pure validation helpers — co-located here (not in 'use server' actions file)
// so they can be exported as plain (non-async) functions and unit-tested.
// ---------------------------------------------------------------------------

/**
 * Returns true if eventDate falls within the booking date range.
 * Checkout day is exclusive — guests depart that day.
 */
export function isEventDateInRange(
  eventDate: string,
  checkIn: string,
  checkOut: string
): boolean {
  return eventDate >= checkIn && eventDate < checkOut
}

/**
 * Returns true if the activity deadline has already passed.
 * Returns false when no deadline is set (null).
 * Accepts an optional `now` parameter for deterministic testing.
 */
export function isDeadlinePassed(
  activityDeadline: string | null,
  now?: Date
): boolean {
  if (!activityDeadline) return false
  return (now ?? new Date()) > new Date(activityDeadline)
}

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

export const ItineraryEventSchema = z
  .object({
    activityId: z.string().uuid().nullable(),
    title: z.string().min(1, 'Title is required').max(200),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be in HH:MM format'),
    notes: z.string().max(500).optional(),
  })
  .refine((s) => s.endTime > s.startTime, { message: 'End time must be after start time' })

export type ItineraryEventInput = z.infer<typeof ItineraryEventSchema>
