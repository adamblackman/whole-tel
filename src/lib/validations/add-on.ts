import { z } from 'zod'

export const TimeSlotSchema = z
  .object({
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be in HH:MM format'),
  })
  .refine((s) => s.end > s.start, { message: 'End must be after start' })

export const AddOnSchema = z
  .object({
    name: z.string().min(1, 'Add-on name is required'),
    description: z.string().optional(),
    price: z.coerce.number().min(0, 'Price must be $0 or more'),
    pricing_unit: z.enum(['per_person', 'per_booking'], {
      error: () => 'Select per person or per booking',
    }),
    max_quantity: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .or(z.literal(''))
      .transform((val) => (val === '' ? null : val)),
    // Tiered pricing (nullable pair)
    included_guests: z.preprocess(
      (val) => (val === '' || val === undefined ? null : val),
      z.coerce.number().int().positive().nullable()
    ),
    per_person_above: z.preprocess(
      (val) => (val === '' || val === undefined ? null : val),
      z.coerce.number().min(0).nullable()
    ),
    // Scheduling (optional — not all experiences need time slots)
    duration_min: z.preprocess(
      (val) => (val === '' || val === undefined ? null : val),
      z.coerce.number().int().min(15).max(1440).nullable()
    ),
    available_slots: z.preprocess(
      (val) => {
        if (typeof val === 'string' && val) {
          try { return JSON.parse(val) } catch { return [] }
        }
        if (Array.isArray(val)) return val
        return []
      },
      z.array(TimeSlotSchema).default([])
    ),
  })
  .refine(
    (data) =>
      (data.included_guests === null) === (data.per_person_above === null),
    {
      message:
        'Both included guests and per-person rate must be set together',
      path: ['included_guests'],
    }
  )
  .refine(
    (data) => {
      // If slots are provided, duration is required
      if (data.available_slots.length > 0 && !data.duration_min) {
        return false
      }
      return true
    },
    {
      message: 'Duration is required when time slots are configured',
      path: ['duration_min'],
    }
  )
