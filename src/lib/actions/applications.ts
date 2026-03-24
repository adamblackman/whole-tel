'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireOwner } from '@/lib/dal'
import { ApplicationSchema } from '@/lib/validations/application'

const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: ['onboarded'],
  rejected: [],
  onboarded: [],
}

export async function submitApplication(
  data: unknown
): Promise<{ error?: string }> {
  const parsed = ApplicationSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid application data' }
  }

  const { propertyBasics, capacity, commonAreas, groupHosting, logistics } =
    parsed.data

  const supabase = await createClient()
  const { error } = await supabase.from('partner_applications').insert({
    status: 'submitted',
    applicant_name: logistics.contactName,
    applicant_email: logistics.contactEmail,
    applicant_phone: logistics.contactPhone,
    property_basics: propertyBasics,
    capacity,
    common_areas: commonAreas,
    group_hosting: groupHosting,
    logistics,
  })

  if (error) {
    return { error: 'Failed to submit application. Please try again.' }
  }

  revalidatePath('/dashboard/applications')
  return {}
}

export async function updateApplicationStatus(
  applicationId: string,
  newStatus: string,
  adminNotes?: string
): Promise<{ error?: string }> {
  const user = await requireOwner()

  const supabase = await createClient()
  const { data: application, error: fetchError } = await supabase
    .from('partner_applications')
    .select('status')
    .eq('id', applicationId)
    .single()

  if (fetchError || !application) {
    return { error: 'Application not found' }
  }

  const allowedTransitions = VALID_TRANSITIONS[application.status] ?? []
  if (!allowedTransitions.includes(newStatus)) {
    return {
      error: `Cannot transition from '${application.status}' to '${newStatus}'`,
    }
  }

  const { error: updateError } = await supabase
    .from('partner_applications')
    .update({
      status: newStatus,
      admin_notes: adminNotes ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  if (updateError) {
    return { error: 'Failed to update application status' }
  }

  revalidatePath('/dashboard/applications')
  return {}
}

export async function createOwnerFromApplication(
  applicationId: string
): Promise<{ tempPassword?: string; error?: string }> {
  await requireOwner()

  const supabase = await createClient()
  const { data: application, error: fetchError } = await supabase
    .from('partner_applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (fetchError || !application) {
    return { error: 'Application not found' }
  }

  if (application.status !== 'approved') {
    return { error: 'Application must be approved before creating an owner account' }
  }

  const tempPassword =
    crypto.randomUUID().replace(/-/g, '').slice(0, 16) + 'A1!'

  const adminClient = createAdminClient()
  const { error: createError } = await adminClient.auth.admin.createUser({
    email: application.applicant_email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      role: 'owner',
      display_name: application.applicant_name,
    },
  })

  if (createError) {
    return { error: createError.message }
  }

  const { error: updateError } = await supabase
    .from('partner_applications')
    .update({
      status: 'onboarded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  if (updateError) {
    return { error: 'Owner account created but failed to update application status' }
  }

  revalidatePath('/dashboard/applications')
  return { tempPassword }
}

export async function saveApplicationNotes(
  applicationId: string,
  notes: string
): Promise<{ error?: string }> {
  const user = await requireOwner()

  const supabase = await createClient()
  const { error } = await supabase
    .from('partner_applications')
    .update({
      admin_notes: notes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  if (error) {
    return { error: 'Failed to save notes' }
  }

  revalidatePath('/dashboard/applications')
  return {}
}
