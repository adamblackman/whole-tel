import { requireOwner } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { BookingsTable } from '@/components/dashboard/BookingsTable'
import type { BookingRow } from '@/components/dashboard/BookingsTable'

export default async function BookingsPage() {
  const user = await requireOwner()
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('bookings')
    .select(`
      id, check_in, check_out, guest_count, total, status, created_at,
      properties!inner(id, name, owner_id)
    `)
    .eq('properties.owner_id', user.id)
    .order('created_at', { ascending: false })

  // Supabase infers properties as an array due to the join, but !inner with a FK
  // always returns a single object at runtime. Normalize to single object shape.
  const bookings: BookingRow[] = (raw ?? []).map((row) => {
    const props = Array.isArray(row.properties) ? row.properties[0] : row.properties
    return {
      id: row.id,
      check_in: row.check_in,
      check_out: row.check_out,
      guest_count: row.guest_count,
      total: row.total,
      status: row.status as BookingRow['status'],
      created_at: row.created_at,
      properties: {
        id: props?.id ?? '',
        name: props?.name ?? '',
      },
    }
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bookings</h1>
      <BookingsTable bookings={bookings} />
    </div>
  )
}
