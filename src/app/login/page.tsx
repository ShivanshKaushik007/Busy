import { login, signup } from './actions'
import { AlertCircle } from 'lucide-react'

export default async function LoginPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const resolvedParams = await searchParams
  const error = typeof resolvedParams.error === 'string' ? resolvedParams.error : null

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-4 py-8 bg-[#FAFBFC] select-none text-[#172B4D]">
      {/* Container */}
      <div className="w-full max-w-sm">
        {/* Busy Platform Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-[4px] bg-[#0052CC] flex items-center justify-center text-white shadow-xs">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.53 2c0 2.4-1.97 4.35-4.4 4.35H2.8v4.35h4.33c4.8 0 8.7-3.9 8.7-8.7V2h-4.3z" />
                <path d="M11.53 9.87c0 2.4-1.97 4.35-4.4 4.35H2.8v4.35h4.33c4.8 0 8.7-3.9 8.7-8.7v-.01h-4.3z" opacity=".75" />
                <path d="M11.53 17.74c0 2.4-1.97 4.35-4.4 4.35H2.8v.01h8.73c2.4 0 4.35-1.95 4.35-4.36h-4.35z" opacity=".5" />
              </svg>
            </div>
            <span className="font-bold text-2xl tracking-tight text-[#172B4D]">
              Busy
            </span>
          </div>
          <h1 className="text-sm font-semibold text-[#5E6C84]">Log in to your Busy account</h1>
        </div>

        {/* Card */}
        <div className="bg-white p-7 rounded-[3px] border border-[#DFE1E6] shadow-sm space-y-4">
          {error && (
            <div className="p-2.5 text-xs text-[#DE350B] bg-[#FFEBE6] border border-[#FFBDAD] rounded-[3px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DE350B]" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label htmlFor="email" className="font-semibold text-[#5E6C84]">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                required
                className="w-full h-8 px-2.5 rounded-[3px] border border-[#DFE1E6] bg-white text-xs text-[#172B4D] outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="font-semibold text-[#5E6C84]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full h-8 px-2.5 rounded-[3px] border border-[#DFE1E6] bg-white text-xs text-[#172B4D] outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-all"
              />
            </div>

            <button 
              type="submit" 
              formAction={login}
              className="w-full h-9 bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white font-medium text-xs rounded-[3px] shadow-2xs transition-colors flex items-center justify-center cursor-pointer mt-2"
            >
              Sign In
            </button>

            {/* Registration divider */}
            <div className="relative py-2 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#DFE1E6]" />
              </div>
              <span className="relative bg-white px-2 text-[10px] font-bold text-[#5E6C84] uppercase tracking-wider">
                Or create an account
              </span>
            </div>

            <div className="space-y-2.5 bg-[#FAFBFC] p-3 rounded-[3px] border border-[#DFE1E6]">
              <div className="space-y-1">
                <label htmlFor="fullName" className="font-semibold text-[#5E6C84]">
                  Full name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  placeholder="e.g. Alex Morgan"
                  className="w-full h-7 px-2 rounded-[3px] border border-[#DFE1E6] bg-white text-xs text-[#172B4D] outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="role" className="font-semibold text-[#5E6C84]">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  defaultValue="member"
                  className="w-full h-7 rounded-[3px] border border-[#DFE1E6] bg-white px-2 text-xs text-[#172B4D] outline-none cursor-pointer focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
                >
                  <option value="member">Regular Member (Assigned projects only)</option>
                  <option value="manager">Manager (Create/archive projects, delete tasks)</option>
                </select>
              </div>

              <button 
                type="submit" 
                formAction={signup}
                className="w-full h-8 bg-white hover:bg-[#EBECF0] border border-[#DFE1E6] text-[#172B4D] font-medium text-xs rounded-[3px] transition-colors flex items-center justify-center cursor-pointer mt-1"
              >
                Sign Up as New User
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-[11px] text-[#5E6C84] space-y-1">
          <p>One account for Busy Project & Task Management</p>
          <div className="flex items-center justify-center gap-3 text-[#5E6C84]">
            <a href="#" className="hover:text-[#0052CC] transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-[#0052CC] transition-colors">User Notice</a>
          </div>
        </div>
      </div>
    </div>
  )
}
