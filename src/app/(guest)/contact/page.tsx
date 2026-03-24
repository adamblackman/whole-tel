import { Mail } from 'lucide-react'
import { ContactForm } from '@/components/contact/ContactForm'

export const metadata = {
  title: 'Contact Us | Whole-Tel\u2122',
}

export default function ContactPage() {
  return (
    <div className="grid gap-12 lg:grid-cols-2">
      {/* Left column */}
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-brand-palm">
          Get in Touch
        </h1>
        <p className="text-zinc-600 leading-relaxed">
          Have a question about a property, want to plan a group trip, or just
          want to say hello? We&apos;d love to hear from you.
        </p>
        <div className="flex items-center gap-3 text-zinc-600">
          <Mail className="h-5 w-5 text-brand-teal" />
          <a
            href="mailto:adam@whole-tel.com"
            className="hover:text-brand-teal transition-colors"
          >
            adam@whole-tel.com
          </a>
        </div>
      </div>

      {/* Right column */}
      <div>
        <ContactForm />
      </div>
    </div>
  )
}
