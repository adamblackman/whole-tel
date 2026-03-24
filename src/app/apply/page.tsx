import { ApplicationForm } from '@/components/applications/ApplicationForm'

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Apply to Be a Whole-Tel Partner
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Tell us about your property and why it&apos;s perfect for groups
          </p>
        </div>
        <ApplicationForm />
      </div>
    </div>
  )
}
