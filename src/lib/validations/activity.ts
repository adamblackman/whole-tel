import { z } from 'zod'

export const TimeSlotSchema = z
  .object({
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be in HH:MM format'),
  })
  .refine((s) => s.end > s.start, { message: 'End must be after start' })

export const ActivitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  duration_min: z.number().int().min(15, 'Duration must be at least 15 minutes').max(1440),
  available_slots: z.array(TimeSlotSchema).min(1, 'At least one time slot is required'),
})

export type TimeSlotInput = z.infer<typeof TimeSlotSchema>
export type ActivityInput = z.infer<typeof ActivitySchema>
