import { z } from 'zod'

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
