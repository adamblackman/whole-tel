'use client'

import { useState, useTransition } from 'react'
import { signUpOwner } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function OwnerSignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await signUpOwner(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full w-fit">
          HOST
        </span>
        <CardTitle className="mt-2">Become a Host</CardTitle>
        <CardDescription>
          Create your owner account to list properties
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 8 characters
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Creating account...' : 'Create owner account'}
          </Button>
        </form>
        {error && (
          <p className="text-sm text-destructive text-center mt-2">{error}</p>
        )}
        <p className="text-sm text-center text-muted-foreground mt-4">
          Already have an owner account?{' '}
          <a href="/owner/login" className="underline">
            Sign in
          </a>
        </p>
      </CardContent>
    </Card>
  )
}
