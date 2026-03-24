import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Hero } from '@/components/landing/Hero'
import { BrandStory } from '@/components/landing/BrandStory'
import { FeaturedProperties } from '@/components/landing/FeaturedProperties'
import { DestinationCards } from '@/components/landing/DestinationCards'
import { Testimonials } from '@/components/landing/Testimonials'
import { TakeoverSteps } from '@/components/landing/TakeoverSteps'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select('*, property_photos(id, storage_path, display_order)')
    .order('nightly_rate', { ascending: true })

  return (
    <div className="min-h-screen">
      <Hero />
      <BrandStory />
      <TakeoverSteps />
      <FeaturedProperties properties={properties ?? []} />
      <DestinationCards />
      <Testimonials />

      {/* Footer */}
      <footer className="bg-brand-palm py-10 px-6 text-white">
        <div className="mx-auto max-w-7xl flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div>
            <p className="text-lg font-bold tracking-tight">Whole-Tel&trade;</p>
            <p className="mt-1 text-sm text-white/60">
              &copy; {new Date().getFullYear()} Whole-Tel. All rights reserved.
            </p>
          </div>
          <nav className="flex gap-6 text-sm text-white/80">
            <Link href="/properties" className="hover:text-white transition-colors">
              Browse Whole-Tels&trade;
            </Link>
            <Link href="/about" className="hover:text-white transition-colors">
              About
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
