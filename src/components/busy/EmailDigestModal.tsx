'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Mail,
  Monitor,
  Smartphone,
  Code2,
  History,
  Send,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Flame,
  X
} from 'lucide-react'
import {
  getOverdueDigestPreview,
  sendOverdueDigest,
  getDigestDispatchLogs,
  DispatchLogItem
} from '@/app/actions/digestActions'
import { OverdueDigestData } from '@/lib/emailDigestUtils'

interface EmailDigestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userRole?: string
}

export default function EmailDigestModal({
  open,
  onOpenChange,
  userRole = 'member'
}: EmailDigestModalProps) {
  const isManager = userRole === 'manager'
  const [scope, setScope] = useState<'personal' | 'portfolio'>(isManager ? 'portfolio' : 'personal')
  const [excludeDismissed, setExcludeDismissed] = useState(true)
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile' | 'raw' | 'logs'>('desktop')

  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [digestData, setDigestData] = useState<OverdueDigestData | null>(null)
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLogItem[]>([])
  const [copied, setCopied] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch preview data
  const loadPreview = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    const res = await getOverdueDigestPreview({
      scope,
      excludeDismissed
    })

    if (res.error) {
      setErrorMessage(res.error)
    } else if (res.data && res.html) {
      setDigestData(res.data)
      setHtmlContent(res.html)
    }
    setLoading(false)
  }, [scope, excludeDismissed])

  // Fetch dispatch logs
  const loadLogs = useCallback(async () => {
    const logs = await getDigestDispatchLogs()
    setDispatchLogs(logs)
  }, [])

  useEffect(() => {
    if (open) {
      loadPreview()
      loadLogs()
      setSuccessMessage(null)
    }
  }, [open, loadPreview, loadLogs])

  // Handle Send Digest Action
  const handleSend = async () => {
    setSending(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    const res = await sendOverdueDigest({
      scope,
      excludeDismissed
    })

    if (res.error) {
      setErrorMessage(res.error)
    } else {
      setSuccessMessage(
        `Digest successfully dispatched to ${res.recipient} (${res.taskCount} overdue tasks summarized)!`
      )
      loadLogs()
    }
    setSending(false)
  }

  // Handle Copy Raw HTML
  const handleCopyHtml = () => {
    navigator.clipboard.writeText(htmlContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-white border border-[#DFE1E6] rounded-[6px] shadow-2xl">
        {/* MODAL HEADER */}
        <DialogHeader className="px-6 py-4 border-b border-[#DFE1E6] bg-[#FAFBFC] shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-[4px] bg-[#0052CC]/10 border border-[#0052CC]/20 flex items-center justify-center text-[#0052CC] shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-[#172B4D] flex items-center gap-2 flex-wrap">
                  <span>Overdue Work Email Digest</span>
                  <span className="text-[10px] font-bold text-[#0052CC] bg-[#DEEBFF] px-2 py-0.5 rounded-[3px] border border-[#B3D4FF]">
                    100% Free • No Paid Services
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5E6C84] mt-0.5 truncate">
                  Responsive HTML digest tracking overdue deadlines, blocked dependencies, and SLA alerts.
                </DialogDescription>
              </div>
            </div>

            {/* Right Header: Overdue Count Div + Close Button (side-by-side with zero overlap) */}
            <div className="flex items-center gap-2.5 shrink-0">
              {digestData && (
                <div className="hidden sm:flex items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-[4px] border border-[#DFE1E6]">
                  <div className="flex items-center gap-1 font-semibold text-[#DE350B]">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{digestData.metrics.totalOverdue} Overdue</span>
                  </div>
                  {digestData.metrics.criticalCount > 0 && (
                    <>
                      <span className="text-[#DFE1E6]">•</span>
                      <span className="text-[#FF8B00] font-medium">
                        {digestData.metrics.criticalCount} Critical
                      </span>
                    </>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-[4px] text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#EBECF0] transition-colors cursor-pointer"
                title="Close modal (Esc)"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
          </div>

          {/* SCOPE & FILTER CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-[#EBECF0]">
            <div className="flex items-center gap-3 text-xs">
              {/* Scope Radio Tabs */}
              <div className="inline-flex bg-[#EBECF0] p-0.5 rounded-[4px]">
                <button
                  type="button"
                  onClick={() => setScope('personal')}
                  className={`px-3 py-1 text-xs font-semibold rounded-[3px] transition-colors cursor-pointer ${
                    scope === 'personal'
                      ? 'bg-white text-[#0052CC] shadow-2xs font-bold'
                      : 'text-[#5E6C84] hover:text-[#172B4D]'
                  }`}
                >
                  My Overdue Tasks
                </button>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => setScope('portfolio')}
                    className={`px-3 py-1 text-xs font-semibold rounded-[3px] transition-colors cursor-pointer ${
                      scope === 'portfolio'
                        ? 'bg-white text-[#0052CC] shadow-2xs font-bold'
                        : 'text-[#5E6C84] hover:text-[#172B4D]'
                    }`}
                  >
                    Portfolio Overview (Manager)
                  </button>
                )}
              </div>

              {/* Exclude Dismissed Checkbox */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[#5E6C84] hover:text-[#172B4D]">
                <input
                  type="checkbox"
                  checked={excludeDismissed}
                  onChange={e => setExcludeDismissed(e.target.checked)}
                  className="rounded text-[#0052CC] focus:ring-[#0052CC] border-[#DFE1E6]"
                />
                <span>Exclude dismissed alerts</span>
              </label>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadPreview}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5E6C84] hover:text-[#172B4D] px-2.5 py-1 rounded-[3px] hover:bg-[#EBECF0] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </DialogHeader>

        {/* TAB NAVIGATION BAR */}
        <div className="flex items-center justify-between px-6 bg-[#F4F5F7] border-b border-[#DFE1E6] shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('desktop')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'desktop'
                  ? 'border-[#0052CC] text-[#0052CC] font-bold bg-white'
                  : 'border-transparent text-[#5E6C84] hover:text-[#172B4D]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop View (640px)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mobile')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'mobile'
                  ? 'border-[#0052CC] text-[#0052CC] font-bold bg-white'
                  : 'border-transparent text-[#5E6C84] hover:text-[#172B4D]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile View (375px)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'raw'
                  ? 'border-[#0052CC] text-[#0052CC] font-bold bg-white'
                  : 'border-transparent text-[#5E6C84] hover:text-[#172B4D]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Raw HTML Source</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'logs'
                  ? 'border-[#0052CC] text-[#0052CC] font-bold bg-white'
                  : 'border-transparent text-[#5E6C84] hover:text-[#172B4D]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Dispatch History</span>
              {dispatchLogs.length > 0 && (
                <span className="text-[10px] font-bold bg-[#EBECF0] text-[#172B4D] px-1.5 rounded-full">
                  {dispatchLogs.length}
                </span>
              )}
            </button>
          </div>

          {/* Direct Browser Route Link */}
          <a
            href={`/api/digest/overdue?preview=true&scope=${scope}&excludeDismissed=${excludeDismissed}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-semibold text-[#0052CC] hover:underline"
          >
            <span>Open standalone preview</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* SUCCESS / ERROR ALERTS */}
        {successMessage && (
          <div className="bg-[#E3FCEF] border-b border-[#ABF5D1] px-6 py-2.5 flex items-center gap-2 text-xs text-[#006644] font-medium animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#36B37E]" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-[#FFEBE6] border-b border-[#FFBDAD] px-6 py-2.5 flex items-center gap-2 text-xs text-[#BF2600] font-medium animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DE350B]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#EBECF0]/60 flex flex-col items-center justify-start min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#5E6C84] my-auto">
              <RefreshCw className="w-8 h-8 animate-spin text-[#0052CC] mb-3" />
              <span className="text-sm font-semibold text-[#172B4D]">Compiling email digest...</span>
              <span className="text-xs text-[#5E6C84] mt-1">Aggregating overdue tasks, SLA metrics, and blocker status</span>
            </div>
          ) : (
            <>
              {/* TAB 1: DESKTOP EMAIL FRAME */}
              {activeTab === 'desktop' && (
                <div className="w-full max-w-[640px] bg-white rounded-[6px] border border-[#DFE1E6] shadow-md overflow-hidden flex flex-col my-auto shrink-0">
                  {/* Mock Email Header Bar */}
                  <div className="px-4 py-2.5 bg-[#FAFBFC] border-b border-[#EBECF0] text-xs text-[#5E6C84] space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>From:</strong> Busy Notifications &lt;digest@busy.internal&gt;
                      </div>
                      <span className="text-[11px] text-[#006644] bg-[#E3FCEF] px-1.5 py-0.2 rounded font-medium border border-[#ABF5D1]">
                        Free SMTP Sandbox
                      </span>
                    </div>
                    <div>
                      <strong>To:</strong> {digestData?.recipient.fullName} &lt;{digestData?.recipient.email}&gt;
                    </div>
                    <div className="text-[#172B4D] font-medium pt-0.5 truncate">
                      <strong>Subject:</strong> Overdue Work Digest — {digestData?.metrics.totalOverdue} Task(s) Requiring Attention
                    </div>
                  </div>

                  {/* Rendered HTML in sandbox iframe */}
                  <div className="h-[460px] overflow-hidden bg-[#F4F5F7]">
                    <iframe
                      title="Desktop Email Digest Preview"
                      srcDoc={htmlContent}
                      className="w-full h-full border-0 bg-transparent"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: MOBILE EMAIL FRAME */}
              {activeTab === 'mobile' && (
                <div className="w-[350px] sm:w-[370px] h-[480px] sm:h-[500px] bg-black rounded-[36px] p-2.5 shadow-2xl border-4 border-[#344563] flex flex-col overflow-hidden relative my-auto shrink-0">
                  {/* Mock Mobile Screen */}
                  <div className="w-full h-full bg-white rounded-[26px] overflow-hidden flex flex-col">
                    {/* Phone Top Notch & Status Bar */}
                    <div className="pt-2 pb-2 px-3 bg-[#FAFBFC] border-b border-[#EBECF0] flex flex-col items-center shrink-0">
                      {/* Dynamic Island pill */}
                      <div className="w-20 h-3.5 bg-black rounded-full mb-1.5 flex items-center justify-end pr-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#2A2E39]" />
                      </div>
                      <div className="w-full flex items-center justify-between text-[10px]">
                        <div className="font-bold text-[#172B4D] truncate">
                          Overdue Work Digest
                        </div>
                        <div className="text-[#6B778C] font-mono">
                          9:41 AM
                        </div>
                      </div>
                    </div>

                    {/* Mobile Email Iframe */}
                    <iframe
                      title="Mobile Email Digest Preview"
                      srcDoc={htmlContent}
                      className="w-full flex-1 border-0 bg-[#F4F5F7]"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: RAW HTML CODE */}
              {activeTab === 'raw' && (
                <div className="w-full max-w-3xl bg-[#1E1E1E] text-[#D4D4D4] rounded-[6px] p-4 font-mono text-xs shadow-inner h-[460px] flex flex-col overflow-hidden my-auto shrink-0">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#333333] shrink-0">
                    <span className="text-gray-400 font-sans text-xs">
                      Inline Styled HTML (Email-Safe Tables)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyHtml}
                      className="flex items-center gap-1.5 bg-[#0052CC] hover:bg-[#0747A6] text-white px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy HTML'}</span>
                    </button>
                  </div>
                  <pre className="flex-1 overflow-auto text-[11px] leading-relaxed select-all">
                    {htmlContent}
                  </pre>
                </div>
              )}

              {/* TAB 4: DISPATCH HISTORY */}
              {activeTab === 'logs' && (
                <div className="w-full max-w-3xl bg-white rounded-[6px] border border-[#DFE1E6] shadow-sm overflow-hidden flex flex-col h-[460px] my-auto shrink-0">
                  <div className="px-4 py-3 bg-[#FAFBFC] border-b border-[#DFE1E6] flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-[#172B4D]">
                      Recent Digest Dispatches (Audited)
                    </span>
                    <span className="text-[11px] text-[#5E6C84]">
                      Stored in `task_history` & Local Engine
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {dispatchLogs.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#5E6C84]">
                        No digests dispatched yet. Click <strong>Send Digest Now</strong> below to trigger a simulated delivery!
                      </div>
                    ) : (
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-[#F4F5F7] text-[#5E6C84] uppercase text-[10px] font-semibold border-b border-[#DFE1E6]">
                          <tr>
                            <th className="py-2.5 px-4">Recipient</th>
                            <th className="py-2.5 px-3">Scope</th>
                            <th className="py-2.5 px-3 text-center">Overdue</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-4 text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EBECF0]">
                          {dispatchLogs.map(log => (
                            <tr key={log.id} className="hover:bg-[#FAFBFC] transition-colors">
                              <td className="py-3 px-4 font-semibold text-[#172B4D]">
                                {log.recipient}
                              </td>
                              <td className="py-3 px-3 capitalize text-[#5E6C84]">
                                {log.scope}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="inline-block bg-[#FFEBE6] text-[#DE350B] font-bold px-2 py-0.5 rounded-[3px]">
                                  {log.taskCount}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#006644] bg-[#E3FCEF] px-2 py-0.5 rounded border border-[#ABF5D1]">
                                  <ShieldCheck className="w-3 h-3" />
                                  {log.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right text-[#6B778C] font-mono text-[11px]">
                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="px-6 py-3.5 bg-white border-t border-[#DFE1E6] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#5E6C84]">
            <Clock className="w-4 h-4 text-[#0052CC]" />
            <span>
              Recipient: <strong className="text-[#172B4D]">{digestData?.recipient.email || 'Loading...'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-[3px] transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || loading}
              className="flex items-center gap-1.5 bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white text-xs font-semibold px-4 py-1.5 rounded-[3px] shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${sending ? 'animate-pulse' : ''}`} />
              <span>{sending ? 'Dispatching...' : 'Send Digest Now'}</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
