import Link from "next/link";
import { Button } from "@/components/ui/button";

export function GuestNav() {
  return (
    <header className="border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-brand-teal font-bold text-xl">
          Whole-Tel
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/properties">Browse Villas</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
