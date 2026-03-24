'use client'

import { use, useState, useTransition } from 'react'
import { signInAsOwner } from '@/lib/actions/auth'
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

export default function OwnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = use(searchParams)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await signInAsOwner(formData)
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
        <CardTitle className="mt-2">Owner Portal</CardTitle>
        <CardDescription>Sign in to manage your properties</CardDescription>
      </CardHeader>
      <CardContent>
        {params.message && (
          <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md mb-4">
            {params.message}
          </p>
        )}
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
              autoComplete="current-password"
              disabled={isPending}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Signing in...' : 'Sign in as owner'}
          </Button>
        </form>
        {error && (
          <p className="text-sm text-destructive text-center mt-2">{error}</p>
        )}
        <p className="text-sm text-center text-muted-foreground mt-4">
          Not an owner?{' '}
          <a href="/login" className="underline">
            Guest login →
          </a>
        </p>
        <p className="text-sm text-center text-muted-foreground mt-1">
          Want to list your property?{' '}
          <a href="/apply" className="underline">
            Apply to be a featured partner on Whole-Tel&trade;
          </a>
        </p>
      </CardContent>
    </Card>
  )
}
