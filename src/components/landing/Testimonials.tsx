import { Card, CardContent } from '@/components/ui/card'

const testimonials = [
  {
    quote:
      'The villa was absolutely stunning and the private chef experience blew us away. Everything was arranged through one booking — so easy.',
    name: 'Sarah M.',
    destination: 'Cabo San Lucas',
  },
  {
    quote:
      'We booked a boat excursion and VIP nightlife add-on. Our group of 12 had the best bachelor party ever. Whole-Tel made it effortless.',
    name: 'Jake R.',
    destination: 'Puerto Vallarta',
  },
  {
    quote:
      'Coordinating a group trip is usually a nightmare, but Whole-Tel handled everything. The villa was party-ready and the sunset tour was magical.',
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
