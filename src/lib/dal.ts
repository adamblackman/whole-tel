import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Verifies the current user session server-side.
 * Uses getUser() (not getSession()) — validates JWT against Supabase auth server.
 * Wrapped in React.cache() to deduplicate across a single request.
 * Redirects to /login if no valid session.
 */
export const verifySession = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  return user
})

/**
 * Verifies the current user is an owner.
 * Builds on verifySession() — any auth failure redirects to /login first.
 * Redirects to / if authenticated but not an owner.
 * Wrapped in React.cache() to deduplicate across a single request.
 */
export const requireOwner = cache(async () => {
  const user = await verifySession()
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'owner') redirect('/')
  return user
})
