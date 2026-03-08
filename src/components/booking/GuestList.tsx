import { Badge } from '@/components/ui/badge'
import type { InvitationStatus } from '@/types/database'

interface GuestListProps {
  invitations: Array<{
    id: string
    email: string
    status: InvitationStatus
    created_at: string
  }>
}

function StatusBadge({ status }: { status: InvitationStatus }) {
  switch (status) {
    case 'accepted':
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
          Accepted
        </Badge>
      )
    case 'declined':
      return (
        <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 text-xs">
          Declined
        </Badge>
      )
    case 'pending':
    default:
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">
          Pending
        </Badge>
      )
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export function GuestList({ invitations }: GuestListProps) {
  if (invitations.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Invited guests</p>
      <div className="space-y-1.5">
        {invitations.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-muted-foreground">{inv.email}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {timeAgo(inv.created_at)}
              </span>
            </div>
            <StatusBadge status={inv.status} />
          </div>
        ))}
      </div>
    </div>
  )
}
