'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ApplicationStatus } from '@/types/database'
import {
  updateApplicationStatus,
  saveApplicationNotes,
  createOwnerFromApplication,
} from '@/lib/actions/applications'

interface ApplicationActionsProps {
  applicationId: string
  currentStatus: ApplicationStatus
  currentNotes: string | null
}

export function ApplicationActions({
  applicationId,
  currentStatus,
  currentNotes,
}: ApplicationActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState(currentNotes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleStatusTransition(newStatus: string) {
    setError(null)
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, newStatus, notes || undefined)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  async function handleSaveNotes() {
    setError(null)
    startTransition(async () => {
      const result = await saveApplicationNotes(applicationId, notes)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  async function handleCreateOwner() {
    setError(null)
    startTransition(async () => {
      const result = await createOwnerFromApplication(applicationId)
      if (result.error) {
        setError(result.error)
      } else if (result.tempPassword) {
        setTempPassword(result.tempPassword)
        router.refresh()
      }
    })
  }

  async function handleCopy() {
    if (tempPassword) {
      await navigator.clipboard.writeText(tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-4">
      {/* Status transition buttons */}
      <div className="flex flex-wrap gap-2">
        {currentStatus === 'submitted' && (
          <Button
            onClick={() => handleStatusTransition('under_review')}
            disabled={isPending}
            variant="outline"
          >
            Move to Review
          </Button>
        )}

        {currentStatus === 'under_review' && (
          <>
            <Button
              onClick={() => handleStatusTransition('approved')}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Approve
            </Button>
            <Button
              onClick={() => handleStatusTransition('rejected')}
              disabled={isPending}
              variant="destructive"
            >
              Reject
            </Button>
          </>
        )}

        {currentStatus === 'approved' && (
          <Button
            onClick={handleCreateOwner}
            disabled={isPending}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            Create Owner Account
          </Button>
        )}

        {currentStatus === 'onboarded' && (
          <p className="text-sm text-muted-foreground">Onboarded — no further actions available.</p>
        )}

        {currentStatus === 'rejected' && (
          <p className="text-sm text-muted-foreground">Rejected — no further actions available.</p>
        )}
      </div>

      {/* Temp password display */}
      {tempPassword && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800">
            Owner account created. Save this password — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white border px-3 py-2 text-sm font-mono">
              {tempPassword}
            </code>
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Admin notes */}
      <div className="space-y-2">
        <Label htmlFor="admin-notes">Admin Notes</Label>
        <Textarea
          id="admin-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal notes about this application..."
          rows={4}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleSaveNotes}
          disabled={isPending}
        >
          Save Notes
        </Button>
      </div>
    </div>
  )
}
