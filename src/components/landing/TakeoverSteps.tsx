import { Search, ListChecks, KeyRound } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const steps = [
  {
    icon: Search,
    step: '1',
    title: 'Browse',
    description: 'Find your perfect Whole-Tel\u2122 from hand-picked properties',
  },
  {
    icon: ListChecks,
    step: '2',
    title: 'Customize',
    description: 'Build your trip with custom activities and experiences',
  },
  {
    icon: KeyRound,
    step: '3',
    title: 'Arrive',
    description: 'Show up and enjoy \u2014 everything is handled',
  },
]

export function TakeoverSteps() {
  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            How a Whole-Tel&trade; Takeover Works
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map(({ icon: Icon, step, title, description }) => (
            <Card key={step} className="text-center">
              <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                  <Icon className="h-7 w-7 text-amber-500" />
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
                  {step}
                </div>
                <h3 className="text-xl font-bold text-zinc-900">{title}</h3>
                <p className="text-zinc-500 leading-relaxed">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
