"use client"

import React, { useMemo, useState } from 'react'
import { FilePlus2 } from 'lucide-react'

type Row = { id: string | number; [key: string]: any }

type Props = {
  rows: Row[]
  defaultParty?: string
}

export default function GeneratePartyInvoiceButton({ rows, defaultParty }: Props) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [partyName, setPartyName] = useState(defaultParty || '')
  const [gstPercent, setGstPercent] = useState<string>('')
  // Removed: shipmentType, mode, serviceType, distanceRegion, weightSlab, baseRate (not required)
  const [fuelPct, setFuelPct] = useState('')
  const [packingAmt, setPackingAmt] = useState('')
  const [handlingAmt, setHandlingAmt] = useState('')
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')
  const [paymentMode, setPaymentMode] = useState('')
  const [useAllFiltered, setUseAllFiltered] = useState(true)
  const [result, setResult] = useState<{ id: number; invoice_number: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Normalize helper
  const norm = (v: any) => String(v || '').trim().toLowerCase()
  // Parties present in current dataset
  const parties = useMemo(() => {
    const set = new Set((rows || []).map(r => String(r.sender_name || '').trim()).filter(Boolean))
    return Array.from(set) as string[]
  }, [rows])
  // Selected rows based on scope and chosen party
  const selectedRows = useMemo(() => (useAllFiltered ? rows : rows.slice(0, 200)), [rows, useAllFiltered])
  const filteredRows = useMemo(() => {
    if (!partyName) return selectedRows
    return selectedRows.filter(r => norm(r.sender_name) === norm(partyName))
  }, [selectedRows, partyName])
  const ids = useMemo(() => filteredRows.map(r => String(r.id)), [filteredRows])
  const partyFromRows = useMemo(() => {
    const set = new Set((rows || []).map(r => String(r.sender_name || '').trim().toLowerCase()).filter(Boolean))
    return set.size === 1 ? (rows[0]?.sender_name || '') : ''
  }, [rows])

  const canSubmit = ids.length > 0 && !!partyName

  const onOpen = () => {
    if (!partyName && partyFromRows) setPartyName(partyFromRows)
    // Prefill from consistent values across rows
    const pickIfUniform = (getter: (r: Row) => any) => {
      const vals = new Set((rows || []).map(getter).map((v: any) => (v == null ? '' : String(v))).map(s => s.trim()))
      return vals.size === 1 ? Array.from(vals)[0] as string : ''
    }
    // Removed prefill for shipmentType/mode/serviceType/distanceRegion

    // Prefill rates from pricing_meta.rate_breakup if uniform
    const getRB = (r: Row) => (r?.pricing_meta?.rate_breakup) || {}
    // Removed base rate prefill (not used)
    const fuelPctU = pickIfUniform(r => getRB(r).fuelPct ?? getRB(r).fuel_pct)
    const packingU = pickIfUniform(r => getRB(r).packing)
    const handlingU = pickIfUniform(r => getRB(r).handling)
    const gstU = pickIfUniform(r => getRB(r).gstPct ?? getRB(r).gst_pct)
    if (!fuelPct && fuelPctU) setFuelPct(fuelPctU)
    if (!packingAmt && packingU) setPackingAmt(packingU)
    if (!handlingAmt && handlingU) setHandlingAmt(handlingU)
    if (!gstPercent && gstU) setGstPercent(gstU)
    setOpen(true)
  }

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/party-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowIds: ids,
          partyName: partyName || partyFromRows || undefined,
          gst_percent: gstPercent ? Number(gstPercent) : undefined,
          // Removed fields not required for party invoice creation
          fuel_pct: fuelPct ? Number(fuelPct) : undefined,
          packing: packingAmt ? Number(packingAmt) : undefined,
          handling: handlingAmt ? Number(handlingAmt) : undefined,
          period_from: periodFrom || undefined,
          period_to: periodTo || undefined,
          payment_mode: paymentMode || undefined,
        })
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data?.detail || data?.error || 'Failed to create invoice'
        throw new Error(msg)
      }
      setResult({ id: data.id, invoice_number: data.invoice_number })
    } catch (e: any) {
      setError(e?.message || 'Failed to create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
        title="Generate Party Invoice"
      >
        <FilePlus2 className="h-4 w-4" /> Generate Party Invoice
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && setOpen(false)} />
          <div className="relative bg-white w-full max-w-xl mx-4 rounded-lg shadow-lg border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-base">Generate Party Invoice</h3>
              <button className="text-gray-500 hover:text-gray-700" disabled={submitting} onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-xs text-gray-500">Consignments selected: {ids.length} for party {partyName ? `“${partyName}”` : '(not selected)'} {useAllFiltered ? '(all filtered)' : '(current page)'}.</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col text-sm">
                  <span className="text-gray-700">Party</span>
                  <select className="border rounded px-2 py-1" value={partyName} onChange={e => setPartyName(e.target.value)}>
                    <option value="">Select party…</option>
                    {parties.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </label>
                {/* Removed Shipment/Mode/Service/Distance/Weight Slab/Base Rate inputs */}
                <label className="flex flex-col text-sm">
                  <span className="text-gray-700">Fuel % (optional)</span>
                  <input className="border rounded px-2 py-1" value={fuelPct} onChange={e => setFuelPct(e.target.value)} placeholder="e.g. 20" />
                </label>
                <label className="flex flex-col text-sm">
                  <span className="text-gray-700">Packing (optional)</span>
                  <input className="border rounded px-2 py-1" value={packingAmt} onChange={e => setPackingAmt(e.target.value)} placeholder="e.g. 0" />
                </label>
                <label className="flex flex-col text-sm">
                  <span className="text-gray-700">Handling (optional)</span>
                  <input className="border rounded px-2 py-1" value={handlingAmt} onChange={e => setHandlingAmt(e.target.value)} placeholder="e.g. 0" />
                </label>
                <label className="flex flex-col text-sm">
                  <span className="text-gray-700">GST % (optional)</span>
                  <input className="border rounded px-2 py-1" value={gstPercent} onChange={e => setGstPercent(e.target.value)} placeholder="e.g. 18" />
                </label>
                <label className="flex flex-col text-sm">
                  <span className="text-gray-700">Period From (optional)</span>
                  <input type="date" className="border rounded px-2 py-1" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} />
                </label>
                <label className="flex flex-col text-sm">
                  <span className="text-gray-700">Period To (optional)</span>
                  <input type="date" className="border rounded px-2 py-1" value={periodTo} onChange={e => setPeriodTo(e.target.value)} />
                </label>
                <label className="flex flex-col text-sm sm:col-span-2">
                  <span className="text-gray-700">Payment Mode (optional)</span>
                  <input className="border rounded px-2 py-1" value={paymentMode} onChange={e => setPaymentMode(e.target.value)} placeholder="Credit / Cash / ..." />
                </label>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" checked={useAllFiltered} onChange={e => setUseAllFiltered(e.target.checked)} />
                  <span>Use all filtered rows (instead of only current page)</span>
                </label>
              </div>
              {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-2">{error}</div>}
              {result && (
                <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-2">
                  Invoice created: <span className="font-mono">{result.invoice_number}</span> — <button 
                    className="underline text-emerald-800 hover:text-emerald-900" 
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/party-invoices/${result.id}/pdf`, {
                          method: 'GET',
                          credentials: 'include',
                          headers: { 'Accept': 'application/pdf' }
                        })
                        if (response.ok) {
                          const blob = await response.blob()
                          const blobUrl = URL.createObjectURL(blob)
                          window.open(blobUrl, '_blank', 'noopener,noreferrer')
                          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
                        } else {
                          alert('Failed to open PDF. Please try again.')
                        }
                      } catch (error) {
                        console.error('Error opening PDF:', error)
                        alert('Failed to open PDF. Please try again.')
                      }
                    }}
                  >Open PDF</button>
                </div>
              )}
            </div>

            <div className="p-3 border-t flex items-center justify-end gap-2">
              <button className="px-3 py-2 text-sm rounded border hover:bg-gray-50" onClick={() => setOpen(false)} disabled={submitting}>Close</button>
              <button
                className="px-3 py-2 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                onClick={submit}
                disabled={!canSubmit || submitting}
              >{submitting ? 'Creating…' : 'Create Invoice'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
