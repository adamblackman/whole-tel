'use client'

import { useTransition } from 'react'
import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => startTransition(async () => { await signOut() })}
      disabled={isPending}
    >
      {isPending ? 'Signing out...' : 'Sign out'}
    </Button>
  )
}
