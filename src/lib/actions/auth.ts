'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Sign up a new guest account.
 * Auto-logs in (email confirmation off in dev) and redirects to /properties.
 * Supports optional return_to redirect parameter.
 */
export async function signUpGuest(
  formData: FormData
): Promise<{ error: string } | void> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const display_name = formData.get('display_name') as string
  const returnTo = (formData.get('return_to') as string) || '/properties'

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: 'guest', display_name },
    },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect(returnTo)
}

/**
 * Sign up a new owner account.
 * Auto-logs in (email confirmation off in dev) and redirects to /dashboard.
 */
export async function signUpOwner(
  formData: FormData
): Promise<{ error: string } | void> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: 'owner' },
    },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

/**
 * Sign in as a guest or general user.
 * Supports optional return_to redirect parameter.
 */
export async function signIn(
  formData: FormData
): Promise<{ error: string } | void> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const returnTo = (formData.get('return_to') as string) || '/'

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect(returnTo)
}

/**
 * Sign in as an owner — verifies the user's profile has role='owner'.
 * Signs out and returns an error if the profile role does not match.
 * Redirects to /dashboard on verified owner sign-in.
 */
export async function signInAsOwner(
  formData: FormData
): Promise<{ error: string } | void> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    return { error: authError.message }
  }

  const user = authData.user

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    await supabase.auth.signOut()
    return { error: 'This account does not have owner access.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

/**
 * Sign out the current user.
 * revalidatePath must be called before redirect to clear server-component cache.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
