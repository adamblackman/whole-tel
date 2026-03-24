import { Card, CardContent } from '@/components/ui/card'

const testimonials = [
  {
    quote:
      'We booked a Whole-Tel\u2122 for my best friend\'s bachelorette and it was the easiest group trip we\'ve ever planned. The property was gorgeous, the private chef dinner was incredible, and we didn\'t have to coordinate a single thing ourselves.',
    name: 'Sarah M.',
    destination: 'Cabo San Lucas',
  },
  {
    quote:
      'Twelve of us went to Puerto Vallarta for a guys\' trip. The all-inclusive setup meant we just showed up and everything was handled -- snorkeling, mariachi band, even groceries stocked before we arrived. Already planning next year.',
    name: 'Jake R.',
    destination: 'Puerto Vallarta',
  },
  {
    quote:
      'We used Whole-Tel\u2122 for our company retreat and it was a game-changer. Beautiful waterfront property, yacht day trip for the whole team, and one invoice for everything. Our CFO was as happy as we were.',
    name: 'Priya K.',
    destination: 'Miami',
  },
]

export function Testimonials() {
  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            What Our Guests Say
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map(({ quote, name, destination }) => (
            <Card key={name} className="flex flex-col justify-between">
              <CardContent className="pt-6">
                <p className="text-zinc-600 leading-relaxed italic">
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="mt-6">
                  <p className="font-semibold text-zinc-900">{name}</p>
                  <p className="text-sm text-zinc-500">{destination}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
