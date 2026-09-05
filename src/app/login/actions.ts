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
    redirect(`/login?mode=signin&error=${encodeURIComponent(error.message || 'Invalid email or password. Please try again.')}`)
  }

  // Revalidate the cache for the home page so it shows fresh data
  revalidatePath('/', 'layout')
  
  // Send them to the dashboard!
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = (formData.get('fullName') as string) || email.split('@')[0]
  const role = (formData.get('role') as string) || 'member'

  // Attempt to sign up via Supabase Auth with metadata
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role === 'manager' ? 'manager' : 'member'
      }
    }
  })

  if (error) {
    redirect(`/login?mode=signup&error=${encodeURIComponent(error.message || 'Could not create user')}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
