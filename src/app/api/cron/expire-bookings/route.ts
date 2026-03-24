import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('bookings')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('status', 'pending')
    .lt('payment_deadline', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('expire-bookings: error expiring bookings', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`expire-bookings: expired ${data?.length ?? 0} bookings`)
  return NextResponse.json({ expired: data?.length ?? 0 })
}
