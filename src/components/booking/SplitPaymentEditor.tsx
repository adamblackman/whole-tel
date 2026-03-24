'use client'

import { useState } from 'react'
import { DollarSign, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { saveSplits, generatePaymentLink } from '@/lib/actions/split-payments'

interface Attendee {
  invitationId: string
  name: string
  email: string
}

interface ExistingSplit {
  invitationId: string
  amount: number
  paymentStatus: 'unpaid' | 'paid'
  stripePaymentLinkUrl: string | null
}

interface SplitPaymentEditorProps {
  bookingId: string
  total: number
  attendees: Attendee[]
  existingSplits: ExistingSplit[]
}

function formatCurrency(dollars: number) {
  return `$${Number(dollars).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function SplitPaymentEditor({
  bookingId,
  total,
  attendees,
  existingSplits,
}: SplitPaymentEditorProps) {
  const initialAmounts: Record<string, string> = {}
  for (const attendee of attendees) {
    const existing = existingSplits.find(
      (s) => s.invitationId === attendee.invitationId
    )
    initialAmounts[attendee.invitationId] = existing
      ? String(existing.amount)
      : ''
  }

  const [amounts, setAmounts] = useState<Record<string, string>>(initialAmounts)
  const [saving, setSaving] = useState(false)
  const [generatingLink, setGeneratingLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [splitsSaved, setSplitsSaved] = useState(existingSplits.length > 0)
  const [linkUrls, setLinkUrls] = useState<Record<string, string>>(() => {
    const urls: Record<string, string> = {}
    for (const s of existingSplits) {
      if (s.stripePaymentLinkUrl) {
        urls[s.invitationId] = s.stripePaymentLinkUrl
      }
    }
    return urls
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const parsedAmounts = attendees.map((a) => ({
    invitationId: a.invitationId,
    value: parseFloat(amounts[a.invitationId] ?? '') || 0,
  }))

  const sumEntered = parsedAmounts.reduce((sum, a) => sum + a.value, 0)
  const remaining = Math.round((total - sumEntered) * 100) / 100
  const isBalanced = Math.abs(remaining) < 0.005

  function handleAmountChange(invitationId: string, value: string) {
    setAmounts((prev) => ({ ...prev, [invitationId]: value }))
    setSplitsSaved(false)
  }

  function handleEvenSplit() {
    if (attendees.length === 0) return
    const base = Math.floor((total * 100) / attendees.length) / 100
    const remainder =
      Math.round((total - base * attendees.length) * 100) / 100
    const next: Record<string, string> = {}
    attendees.forEach((a, i) => {
      const amount = i === attendees.length - 1 ? base + remainder : base
      next[a.invitationId] = String(amount.toFixed(2))
    })
    setAmounts(next)
    setSplitsSaved(false)
  }

  async function handleSaveSplits() {
    setError(null)
    setSaving(true)
    const result = await saveSplits({
      bookingId,
      splits: parsedAmounts.map((a) => ({
        invitationId: a.invitationId,
        amount: a.value,
      })),
    })
    setSaving(false)
    if (result.success) {
      setSplitsSaved(true)
    } else {
      setError(result.error ?? 'Failed to save splits')
    }
  }

  async function handleGenerateLink(invitationId: string) {
    setError(null)
    setGeneratingLink(invitationId)
    const result = await generatePaymentLink({ bookingId, invitationId })
    setGeneratingLink(null)
    if (result.success && result.url) {
      setLinkUrls((prev) => ({ ...prev, [invitationId]: result.url! }))
    } else {
      setError(result.error ?? 'Failed to generate link')
    }
  }

  async function handleCopy(invitationId: string, url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(invitationId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setError('Failed to copy link')
    }
  }

  function remainingColor() {
    if (isBalanced) return 'text-green-600'
    if (remaining > 0) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Split Payments</span>
        {attendees.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs px-2"
            onClick={handleEvenSplit}
          >
            Even split
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {attendees.map((attendee) => {
          const existing = existingSplits.find(
            (s) => s.invitationId === attendee.invitationId
          )
          const isPaid = existing?.paymentStatus === 'paid'
          const linkUrl = linkUrls[attendee.invitationId] ?? null
          const displayName = attendee.name || attendee.email

          return (
            <div key={attendee.invitationId} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm min-w-0 flex-1 truncate" title={displayName}>
                  {displayName}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amounts[attendee.invitationId] ?? ''}
                    onChange={(e) =>
                      handleAmountChange(attendee.invitationId, e.target.value)
                    }
                    disabled={isPaid}
                    className="w-28 h-8 text-sm"
                    placeholder="0.00"
                  />

                  {isPaid ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 shrink-0">
                      Paid
                    </Badge>
                  ) : (
                    existing && (
                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 shrink-0">
                        Unpaid
                      </Badge>
                    )
                  )}

                  {!isPaid && splitsSaved && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs shrink-0"
                      onClick={() => handleGenerateLink(attendee.invitationId)}
                      disabled={generatingLink === attendee.invitationId}
                    >
                      {generatingLink === attendee.invitationId
                        ? 'Generating...'
                        : linkUrl
                          ? 'Regenerate'
                          : 'Generate Link'}
                    </Button>
                  )}
                </div>
              </div>

              {!isPaid && linkUrl && (
                <div className="flex items-center gap-2 pl-0">
                  <span
                    className="text-xs text-muted-foreground truncate flex-1 min-w-0"
                    title={linkUrl}
                  >
                    {linkUrl}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleCopy(attendee.invitationId, linkUrl)}
                  >
                    {copiedId === attendee.invitationId ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <span className={`text-sm font-medium ${remainingColor()}`}>
          Remaining: {formatCurrency(remaining)}
        </span>
        <Button
          size="sm"
          onClick={handleSaveSplits}
          disabled={!isBalanced || saving}
          className="h-8 text-xs"
        >
          {saving ? 'Saving...' : 'Save Splits'}
        </Button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
