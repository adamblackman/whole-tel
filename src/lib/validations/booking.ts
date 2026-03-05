import { z } from 'zod'

export const bookingInputSchema = z.object({
  propertyId: z.string().uuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // "YYYY-MM-DD"
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestCount: z.number().int().min(1),
  selectedAddOnIds: z.array(z.string().uuid()),
})

export type BookingInput = z.infer<typeof bookingInputSchema>
