import AuthClient from './AuthClient'

export default async function LoginPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const resolvedParams = await searchParams
  const error = typeof resolvedParams.error === 'string' ? resolvedParams.error : null
  const mode = resolvedParams.mode === 'signup' ? 'signup' : 'signin'

  return <AuthClient initialMode={mode} initialError={error} />
}
