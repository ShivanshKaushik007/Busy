'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // Use the email and password from the submitted form data
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // Attempt to sign in via Supabase Auth
  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    // Return an error to be handled in the client form (in a real app, maybe redirect with ?error)
    redirect('/login?error=Could not authenticate user')
  }

  // Revalidate the cache for the home page so it shows fresh data
  revalidatePath('/', 'layout')
  
  // Send them to the dashboard!
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // Attempt to sign up via Supabase Auth
  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/login?error=Could not create user')
  }

  // After sign-up, typically they will be sent an email confirmation, 
  // but for local testing, they might just be logged in. 
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
