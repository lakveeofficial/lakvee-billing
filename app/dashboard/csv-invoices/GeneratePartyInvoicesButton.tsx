'use client'

import { useState, useTransition } from 'react'

export default function GeneratePartyInvoicesButton({ party }: { party: string }) {
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const onClick = async () => {
    if (loading) return
    // Try to read current selection from the Party <select> so user doesn't need to click Apply first
    const selected = (document.querySelector('select[name="party"]') as HTMLSelectElement | null)?.value?.trim() || ''
    const chosenParty = selected || party || ''
    const scope = chosenParty ? `for party: "${chosenParty}"` : 'for all parties'
    if (!confirm(`Generate combined invoice(s) ${scope}?`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/csv-invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ party: chosenParty })
      , credentials: 'include'
      })
      let data: any = null
      try { data = await res.json() } catch {
        try { const text = await res.text(); data = { error: text } } catch { /* ignore */ }
      }
      if (!res.ok) {
        alert(data?.error || data?.details || 'Failed to generate invoices')
        return
      }
      alert(data?.message || `Generated ${data?.created ?? ''} invoices`)
      if ((data?.created ?? 0) > 0) {
        // Navigate to CSV Invoices Combined tab when invoices created
        const qs = new URLSearchParams({ view: 'combined' })
        if (chosenParty) qs.set('party', chosenParty)
        startTransition(() => {
          window.location.href = `/dashboard/csv-invoices?${qs.toString()}`
        })
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to generate invoices')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || isPending}
      className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
      title="Generate party-wise combined invoice(s)"
    >
      {loading || isPending ? 'Generating…' : (party ? `Generate for "${party}"` : 'Generate Party-wise Invoices')}
    </button>
  )
}
