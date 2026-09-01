import { login, signup } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // Extract error from URL if login/signup failed
  const resolvedParams = await searchParams;
  const error = typeof resolvedParams.error === 'string' ? resolvedParams.error : null

  return (
    <div className="flex h-screen w-full items-center justify-center px-4 bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Project Manager</CardTitle>
          <CardDescription>
            Enter your email below to login to your account.
          </CardDescription>
        </CardHeader>
        
        {/* We use standard HTML forms mapped to Next.js server actions */}
        <form>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
              />
            </div>
            
            {/* Display error message if present */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            {/* formaction allows multiple buttons to trigger different server actions */}
            {/* Using native button to ensure formAction works properly with Next.js */}
            <button 
              type="submit" 
              formAction={login}
              className="group/button inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-transparent bg-primary px-2.5 text-sm font-medium text-primary-foreground whitespace-nowrap transition-all outline-none select-none hover:bg-primary/80 w-full"
            >
              Sign In
            </button>
            <button 
              type="submit" 
              formAction={signup}
              className="group/button inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted hover:text-foreground whitespace-nowrap transition-all outline-none select-none w-full"
            >
              Sign Up
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
