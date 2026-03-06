'use client'

import { useActionState, useRef, useEffect } from 'react'
import { sendContactEmail } from '@/lib/actions/contact'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(sendContactEmail, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={5} required />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      {state?.success && (
        <p className="text-sm text-brand-teal">{state.success}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="bg-brand-teal text-white hover:bg-brand-teal/90"
      >
        {isPending ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  )
}
