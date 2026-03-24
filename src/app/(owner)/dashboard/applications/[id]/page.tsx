import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PartnerApplication } from '@/types/database'
import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge'
import { ApplicationActions } from '@/components/applications/ApplicationActions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>
}

function DetailRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (value === null || value === undefined) return null
  const display =
    typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground min-w-36 shrink-0">{label}</span>
      <span>{display}</span>
    </div>
  )
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: application, error } = await supabase
    .from('partner_applications')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !application) {
    notFound()
  }

  const app = application as PartnerApplication
  const basics = app.property_basics as Record<string, unknown>
  const capacity = app.capacity as Record<string, unknown>
  const commonAreas = app.common_areas as Record<string, unknown>
  const groupHosting = app.group_hosting as Record<string, unknown>
  const logistics = app.logistics as Record<string, unknown>
  const bedConfig = capacity?.bedConfig as Record<string, number> | undefined

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/applications"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        &larr; Back to applications
      </Link>

      {/* Status header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl">
                {(basics?.propertyName as string) ?? 'Unnamed Property'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {app.applicant_name} &middot; {app.applicant_email}
                {app.applicant_phone ? ` · ${app.applicant_phone}` : ''}
              </p>
            </div>
            <ApplicationStatusBadge status={app.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Submitted: {new Date(app.created_at).toLocaleString()}</p>
          {app.reviewed_at && (
            <p>Last reviewed: {new Date(app.reviewed_at).toLocaleString()}</p>
          )}
        </CardContent>
      </Card>

      {/* Status actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationActions
            applicationId={app.id}
            currentStatus={app.status}
            currentNotes={app.admin_notes}
          />
        </CardContent>
      </Card>

      {/* Property Basics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DetailRow label="Property Name" value={basics?.propertyName as string} />
          <DetailRow label="Location" value={basics?.location as string} />
          <DetailRow label="Property Type" value={basics?.propertyType as string} />
          <Separator />
          <p className="text-sm">{basics?.description as string}</p>
        </CardContent>
      </Card>

      {/* Capacity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capacity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DetailRow label="Max Guests" value={capacity?.maxGuests as number} />
          <DetailRow label="Bedrooms" value={capacity?.bedrooms as number} />
          <DetailRow label="Bathrooms" value={capacity?.bathrooms as number} />
          {bedConfig && (
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground font-medium mt-2">Bed Configuration</p>
              {bedConfig.king > 0 && <DetailRow label="King" value={bedConfig.king} />}
              {bedConfig.queen > 0 && <DetailRow label="Queen" value={bedConfig.queen} />}
              {bedConfig.double > 0 && <DetailRow label="Double" value={bedConfig.double} />}
              {bedConfig.twin > 0 && <DetailRow label="Twin" value={bedConfig.twin} />}
              {bedConfig.bunk > 0 && <DetailRow label="Bunk" value={bedConfig.bunk} />}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Common Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Common Areas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DetailRow label="Pool" value={commonAreas?.hasPool as boolean} />
          <DetailRow label="Hot Tub" value={commonAreas?.hasHotTub as boolean} />
          <DetailRow label="Outdoor Spaces" value={commonAreas?.outdoorSpaces as string} />
          <DetailRow label="Kitchen" value={commonAreas?.kitchenType as string} />
          <DetailRow label="Notable Amenities" value={commonAreas?.notableAmenities as string} />
        </CardContent>
      </Card>

      {/* Group Hosting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Group Hosting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DetailRow label="Group Experience" value={groupHosting?.hasGroupExperience as boolean} />
          <DetailRow label="Experience Details" value={groupHosting?.groupExperienceDetails as string} />
          <DetailRow label="Max Group Size" value={groupHosting?.maxGroupSize as number} />
          <DetailRow label="Unique for Groups" value={groupHosting?.uniqueForGroups as string} />
        </CardContent>
      </Card>

      {/* Logistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DetailRow label="Check-in Time" value={logistics?.checkInTime as string} />
          <DetailRow label="Check-out Time" value={logistics?.checkOutTime as string} />
          <DetailRow label="Minimum Stay" value={`${logistics?.minimumStay} night(s)`} />
          <DetailRow label="Photo Links" value={logistics?.photoLinks as string} />
          <Separator />
          <p className="text-sm text-muted-foreground font-medium">Contact</p>
          <DetailRow label="Name" value={logistics?.contactName as string} />
          <DetailRow label="Email" value={logistics?.contactEmail as string} />
          <DetailRow label="Phone" value={logistics?.contactPhone as string} />
        </CardContent>
      </Card>
    </div>
  )
}
