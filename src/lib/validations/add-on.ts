import { z } from 'zod'

export const AddOnSchema = z.object({
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
})
