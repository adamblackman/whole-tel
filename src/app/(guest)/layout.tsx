import { GuestNav } from "@/components/GuestNav";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GuestNav />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </>
  );
}
