import { LoginForm } from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; return_to?: string }>
}) {
  const params = await searchParams

  return <LoginForm message={params.message} returnTo={params.return_to} />
}
