import { createClient } from '@/lib/supabase/server'
import { ApplicationStatus, PartnerApplication } from '@/types/database'
import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

const STATUS_TABS: { label: string; value: string | null }[] = [
  { label: 'All', value: null },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Onboarded', value: 'onboarded' },
]

interface ApplicationsPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const { status } = await searchParams
  const activeStatus = status ?? null

  const supabase = await createClient()
  let query = supabase
    .from('partner_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (activeStatus) {
    query = query.eq('status', activeStatus as ApplicationStatus)
  }

  const { data: applications, error } = await query

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Partner Applications</h1>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {STATUS_TABS.map((tab) => {
          const isActive = tab.value === activeStatus
          const href = tab.value ? `/dashboard/applications?status=${tab.value}` : '/dashboard/applications'
          return (
            <Link
              key={tab.label}
              href={href}
              className={[
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              ].join(' ')}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Application list */}
      {error ? (
        <p className="text-sm text-red-600">Failed to load applications.</p>
      ) : !applications || applications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No applications found.</p>
      ) : (
        <div className="space-y-3">
          {applications.map((app: PartnerApplication) => {
            const propertyName =
              (app.property_basics as Record<string, unknown>)?.propertyName as string | undefined
            return (
              <Link key={app.id} href={`/dashboard/applications/${app.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium truncate">
                        {propertyName ?? 'Unnamed Property'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {app.applicant_name} &middot; {app.applicant_email}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <ApplicationStatusBadge status={app.status} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
