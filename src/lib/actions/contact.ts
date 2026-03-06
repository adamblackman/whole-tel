'use server'

import { z } from 'zod'
import { getResend } from '@/lib/email'

const ContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

export async function sendContactEmail(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const parsed = ContactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, email, message } = parsed.data

  try {
    await getResend().emails.send({
      from: 'Whole-Tel <noreply@whole-tel.com>',
      to: 'adam@whole-tel.com',
      replyTo: email,
      subject: `Contact form: ${name}`,
      text: `From: ${name} (${email})\n\n${message}`,
    })

    return { success: 'Message sent! We will get back to you soon.' }
  } catch {
    return { error: 'Failed to send message. Please try again.' }
  }
}
