'use client'

import { useState, useTransition } from 'react'
import { signIn } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm({ message, returnTo }: { message?: string; returnTo?: string }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)
    if (returnTo) {
      formData.set('return_to', returnTo)
    }
    startTransition(async () => {
      const result = await signIn(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        {message && (
          <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md mb-4">
            {message}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isPending}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Signing in...' : 'Sign in'}
          </Button>
          {error && (
            <p className="text-sm text-destructive text-center mt-2">{error}</p>
          )}
        </form>
        <p className="text-sm text-center text-muted-foreground mt-4">
          New to Whole-Tel&trade;?{' '}
          <a href="/signup" className="underline">
            Create account
          </a>
        </p>
        <p className="text-sm text-center text-muted-foreground mt-1">
          Are you an owner?{' '}
          <a href="/owner/login" className="underline">
            Owner login →
          </a>
        </p>
      </CardContent>
    </Card>
  )
}
