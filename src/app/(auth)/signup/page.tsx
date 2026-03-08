import { SignupForm } from './SignupForm'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>
}) {
  const params = await searchParams

  return <SignupForm returnTo={params.return_to} />
}
