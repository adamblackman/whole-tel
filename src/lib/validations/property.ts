import { z } from 'zod'

export const PropertySchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  description: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  address: z.string().optional(),
  bedrooms: z.coerce.number().int().min(1, 'At least 1 bedroom required'),
  bathrooms: z.coerce.number().int().min(1, 'At least 1 bathroom required'),
  max_guests: z.coerce.number().int().min(1, 'At least 1 guest required'),
  nightly_rate: z.coerce.number().min(1, 'Nightly rate must be at least $1'),
  cleaning_fee: z.coerce.number().min(0).default(0),
  amenities: z.string().optional(), // JSON string from form — parsed to array in action
  house_rules: z.string().optional(),
  check_in_time: z.string().default('3:00 PM'),
  check_out_time: z.string().default('11:00 AM'),
})

export type ActionState = {
  errors?: Record<string, string[]>
  message?: string
}
