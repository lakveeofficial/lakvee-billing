"use client"

import React, { useMemo, useState } from 'react'
import { Zap } from 'lucide-react'
import ModalShell from '@/components/ModalShell'

type Props = {
  ids: Array<string | number>
  labels?: Record<string, string> // id -> consignment_no (or any display label)
  partyNames?: Record<string, string> // id -> party name
}

type ResultItem = {
  id: string
  label?: string
  ok: boolean
  status: number
  message: string
}

export default function GlobalApplyRatesButton({ ids, labels, partyNames }: Props) {
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<ResultItem[] | null>(null)

  const visibleCount = ids?.length || 0

  const summary = useMemo(() => {
    const arr = results || []
    const ok = arr.filter(r => r.ok).length
    const fail = arr.filter(r => !r.ok).length
    return { ok, fail, total: arr.length }
  }, [results])

  const applyAll = async () => {
    if (!ids || ids.length === 0) {
      setOpen(true)
      setResults([{ id: '-', ok: false, status: 0, message: 'No rows to process.' }])
      return
    }
    setOpen(true)
    setRunning(true)
    const out: ResultItem[] = []

    // Limit concurrency to avoid overwhelming server
    const concurrency = 5
    let index = 0

    const worker = async () => {
      while (index < ids.length) {
        const currentIndex = index++
        const id = String(ids[currentIndex])
        try {
          const res = await fetch(`/api/csv-invoices/${id}/apply-rate`, { method: 'POST' })
          let msg = ''
          try {
            const data = await res.json()
            msg = data?.message || data?.status || (res.ok ? 'Applied' : '')
          } catch {
            msg = res.ok ? 'Applied' : await res.text().catch(() => '')
          }
          if (!res.ok) {
            const party = partyNames?.[id] || 'Party Name'
            msg = `Rate Slab is not Available for the (${party})`
          }
          out.push({ id, label: labels?.[id] || id, ok: res.ok, status: res.status, message: msg })
        } catch (e: any) {
          const party = partyNames?.[id] || 'Party Name'
          const msg = `Rate Slab is not Available for the (${party})`
          out.push({ id, label: labels?.[id] || id, ok: false, status: 0, message: msg })
        }
        setResults([...out])
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, ids.length) }, () => worker())
    await Promise.all(workers)
    setRunning(false)
  }

  return (
    <div>
      <button
        type="button"
        onClick={applyAll}
        className="group inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm shadow-md hover:from-amber-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={running || visibleCount === 0}
        title={visibleCount ? `Apply to ${visibleCount} consignments` : 'No consignments to apply'}
      >
        {running ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
            Applying Slab Rates…
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Zap className="h-4 w-4 drop-shadow-sm" />
            Apply Slab Rates (All)
          </span>
        )}
      </button>

      {open && (
        <ModalShell
          isOpen={open}
          onClose={() => !running && setOpen(false)}
          title="Apply Slab Rates — Results"
          icon={<Zap className="h-5 w-5" />}
          size="lg"
          closeOnOverlay={!running}
          footer={(
            <>
              <button
                className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
                onClick={() => window.location.reload()}
                disabled={running}
              >Refresh</button>
              <button
                className="px-3 py-2 text-sm rounded bg-gray-800 text-white hover:bg-black disabled:opacity-60"
                onClick={() => setOpen(false)}
                disabled={running}
              >Close</button>
            </>
          )}
        >
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            <div className="text-sm text-gray-700">
              <span className="font-semibold">Summary:</span> {summary.ok} succeeded, {summary.fail} failed{results ? ` out of ${summary.total}` : ''}.
            </div>
            {running && (
              <div className="text-sm text-blue-700">Processing… please wait.</div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-2">Consignment No</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(results || []).map((r) => (
                  <tr key={r.id} className={r.ok ? 'bg-emerald-50' : 'bg-rose-50'}>
                    <td className="py-2 pr-2 font-mono text-xs">{r.label || r.id}</td>
                    <td className="py-2 pr-2">{r.ok ? 'Success' : (r.message || 'Failed')}</td>
                    <td className="py-2 whitespace-pre-wrap">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
