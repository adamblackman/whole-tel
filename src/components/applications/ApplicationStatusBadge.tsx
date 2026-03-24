import { Badge } from '@/components/ui/badge'
import { ApplicationStatus } from '@/types/database'

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  submitted: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  under_review: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  approved: 'bg-green-100 text-green-800 hover:bg-green-100',
  rejected: 'bg-red-100 text-red-800 hover:bg-red-100',
  onboarded: 'bg-teal-100 text-teal-800 hover:bg-teal-100',
}

function formatStatus(status: ApplicationStatus): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus
}

export function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  return (
    <Badge className={STATUS_STYLES[status]}>
      {formatStatus(status)}
    </Badge>
  )
}
