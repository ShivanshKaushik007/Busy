'use client'

import React, { useState, useTransition } from 'react'
import { 
  AlertCircle, 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Check, 
  Users, 
  X
} from 'lucide-react'
import { login, signup } from './actions'

interface AuthClientProps {
  initialMode: 'signin' | 'signup'
  initialError?: string | null
}

export default function AuthClient({ initialMode, initialError }: AuthClientProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [error, setError] = useState<string | null>(initialError || null)
  const [showPassword, setShowPassword] = useState(false)
  
  // Sign In inputs
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')

  // Sign Up inputs
  const [signUpName, setSignUpName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<'member' | 'manager'>('member')

  const [isPending, startTransition] = useTransition()

  const handleSignInSubmit = (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      await login(formData)
    })
  }

  const handleSignUpSubmit = (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      await signup(formData)
    })
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-4 py-10 bg-[#FAFBFC] select-none text-[#172B4D]">
      {/* Container */}
      <div className="w-full max-w-md">
        {/* Busy Platform Branding Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-[4px] bg-[#0052CC] flex items-center justify-center text-white shadow-xs">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.53 2c0 2.4-1.97 4.35-4.4 4.35H2.8v4.35h4.33c4.8 0 8.7-3.9 8.7-8.7V2h-4.3z" />
                <path d="M11.53 9.87c0 2.4-1.97 4.35-4.4 4.35H2.8v4.35h4.33c4.8 0 8.7-3.9 8.7-8.7v-.01h-4.3z" opacity=".75" />
                <path d="M11.53 17.74c0 2.4-1.97 4.35-4.4 4.35H2.8v.01h8.73c2.4 0 4.35-1.95 4.35-4.36h-4.35z" opacity=".5" />
              </svg>
            </div>
            <span className="font-bold text-2xl tracking-tight text-[#172B4D]">
              Busy
            </span>
          </div>
          <p className="text-xs text-[#5E6C84]">Enterprise Project & Task Management</p>
        </div>

        {/* Authentication Card */}
        <div className="bg-white rounded-[6px] border border-[#DFE1E6] shadow-sm overflow-hidden">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-[#DFE1E6] bg-[#FAFBFC] p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setError(null)
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-[4px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-[#0052CC] shadow-xs border border-[#DFE1E6]/80 font-bold'
                  : 'text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#EBECF0]/60'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError(null)
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-[4px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-[#0052CC] shadow-xs border border-[#DFE1E6]/80 font-bold'
                  : 'text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#EBECF0]/60'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-3 text-xs text-[#DE350B] bg-[#FFEBE6] border border-[#FFBDAD] rounded-[4px] flex items-start justify-between gap-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#DE350B]" />
                  <span className="font-medium">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-[#DE350B] hover:text-[#BF2600] p-0.5 cursor-pointer"
                  title="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SIGN IN VIEW                                                              */}
            {/* ========================================================================= */}
            {mode === 'signin' && (
              <div className="space-y-4">
                {/* Header Subtitle */}
                <div>
                  <h2 className="text-base font-bold text-[#172B4D]">Welcome back</h2>
                  <p className="text-xs text-[#5E6C84] mt-0.5">
                    Sign in to your account to access your workspace.
                  </p>
                </div>

                {/* Sign In Form */}
                <form action={handleSignInSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label htmlFor="signin-email" className="font-semibold text-[#5E6C84] block">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#5E6C84]" />
                      <input
                        id="signin-email"
                        name="email"
                        type="email"
                        required
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full h-8.5 pl-8 pr-3 rounded-[3px] border border-[#DFE1E6] bg-white text-xs text-[#172B4D] outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor="signin-password" className="font-semibold text-[#5E6C84]">
                        Password
                      </label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#5E6C84]" />
                      <input
                        id="signin-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-8.5 pl-8 pr-8 rounded-[3px] border border-[#DFE1E6] bg-white text-xs text-[#172B4D] outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-[#5E6C84] hover:text-[#172B4D] cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-9 bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white font-medium text-xs rounded-[3px] shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-4"
                  >
                    <span>{isPending ? 'Signing In...' : 'Sign In'}</span>
                    {!isPending && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </form>

                {/* Footer Switcher */}
                <div className="pt-3 border-t border-[#DFE1E6] text-center text-xs text-[#5E6C84]">
                  <span>Don&apos;t have an account yet? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup')
                      setError(null)
                    }}
                    className="font-semibold text-[#0052CC] hover:underline cursor-pointer"
                  >
                    Create an account
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SIGN UP VIEW                                                              */}
            {/* ========================================================================= */}
            {mode === 'signup' && (
              <div className="space-y-4">
                {/* Header Subtitle */}
                <div>
                  <h2 className="text-base font-bold text-[#172B4D]">Create your account</h2>
                  <p className="text-xs text-[#5E6C84] mt-0.5">
                    Set up your profile and choose your workspace role.
                  </p>
                </div>

                {/* Sign Up Form */}
                <form action={handleSignUpSubmit} className="space-y-3.5 text-xs">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label htmlFor="signup-fullname" className="font-semibold text-[#5E6C84] block">
                      Full name
                    </label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#5E6C84]" />
                      <input
                        id="signup-fullname"
                        name="fullName"
                        type="text"
                        required
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full h-8.5 pl-8 pr-3 rounded-[3px] border border-[#DFE1E6] bg-white text-xs text-[#172B4D] outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1">
                    <label htmlFor="signup-email" className="font-semibold text-[#5E6C84] block">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#5E6C84]" />
                      <input
                        id="signup-email"
                        name="email"
                        type="email"
                        required
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full h-8.5 pl-8 pr-3 rounded-[3px] border border-[#DFE1E6] bg-white text-xs text-[#172B4D] outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label htmlFor="signup-password" className="font-semibold text-[#5E6C84] block">
                      Create a password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#5E6C84]" />
                      <input
                        id="signup-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        minLength={6}
                        className="w-full h-8.5 pl-8 pr-8 rounded-[3px] border border-[#DFE1E6] bg-white text-xs text-[#172B4D] outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-[#5E6C84] hover:text-[#172B4D] cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Workspace Role Selector */}
                  <div className="space-y-1.5 pt-1">
                    <label className="font-semibold text-[#5E6C84] block">
                      Workspace role & access level
                    </label>
                    <input type="hidden" name="role" value={selectedRole} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Regular Member Role */}
                      <button
                        type="button"
                        onClick={() => setSelectedRole('member')}
                        className={`p-3 rounded-[4px] border text-left transition-all cursor-pointer relative ${
                          selectedRole === 'member'
                            ? 'bg-[#DEEBFF]/30 border-[#0052CC] ring-1 ring-[#0052CC]'
                            : 'bg-[#FAFBFC] border-[#DFE1E6] hover:bg-white hover:border-[#B3D4FF]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-[#172B4D]">
                            <Users className="w-3.5 h-3.5 text-[#0052CC]" />
                            <span>Team Member</span>
                          </div>
                          {selectedRole === 'member' && (
                            <div className="w-4 h-4 rounded-full bg-[#0052CC] text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-[#5E6C84] mt-1.5 leading-snug">
                          View assigned projects, advance task statuses, and log work or comments.
                        </p>
                      </button>

                      {/* Manager Role */}
                      <button
                        type="button"
                        onClick={() => setSelectedRole('manager')}
                        className={`p-3 rounded-[4px] border text-left transition-all cursor-pointer relative ${
                          selectedRole === 'manager'
                            ? 'bg-[#DEEBFF]/30 border-[#0052CC] ring-1 ring-[#0052CC]'
                            : 'bg-[#FAFBFC] border-[#DFE1E6] hover:bg-white hover:border-[#B3D4FF]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-[#172B4D]">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#0052CC]" />
                            <span>Manager</span>
                          </div>
                          {selectedRole === 'manager' && (
                            <div className="w-4 h-4 rounded-full bg-[#0052CC] text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-[#5E6C84] mt-1.5 leading-snug">
                          Universal portfolio oversight: create/archive projects, manage rosters & delete tasks.
                        </p>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-9 bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white font-medium text-xs rounded-[3px] shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-4"
                  >
                    <span>{isPending ? 'Creating Account...' : 'Create Account'}</span>
                    {!isPending && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </form>

                {/* Footer Switcher */}
                <div className="pt-3 border-t border-[#DFE1E6] text-center text-xs text-[#5E6C84]">
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin')
                      setError(null)
                    }}
                    className="font-semibold text-[#0052CC] hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-[11px] text-[#5E6C84] space-y-1">
          <p>Busy — Server-Authoritative Project & Task Management</p>
          <div className="flex items-center justify-center gap-3 text-[#5E6C84]">
            <span>Role-Based Access Control</span>
            <span>•</span>
            <span>Immutable Audit Trail</span>
          </div>
        </div>
      </div>
    </div>
  )
}
