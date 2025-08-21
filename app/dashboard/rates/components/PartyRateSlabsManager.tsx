
'use client'

import { useEffect, useMemo, useState } from 'react'
import type { WeightSlab, Mode, ServiceType, DistanceSlab, ShipmentType, PartyRateSlab } from '@/types/rate-slabs'

// Party selection UI removed; partyId is required via context

type AuditLog = {
  id: number
  party_rate_slab_id: number
  action: string
  before_data: any
  after_data: any
  changed_by: string | null
  changed_at: string
}

const SHIPMENT_TYPES: ShipmentType[] = ['DOCUMENT', 'NON_DOCUMENT']

export default function PartyRateSlabsManager({ partyId }: { partyId?: number }) {
  const [modes, setModes] = useState<Mode[]>([])
  const [services, setServices] = useState<ServiceType[]>([])
  const [distances, setDistances] = useState<DistanceSlab[]>([])
  const [slabs, setSlabs] = useState<WeightSlab[]>([])


  const [rows, setRows] = useState<PartyRateSlab[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAllScenarios, setShowAllScenarios] = useState(false)

  const [form, setForm] = useState<Partial<PartyRateSlab>>({
    shipment_type: 'DOCUMENT',
    mode_id: undefined,
    service_type_id: undefined,
    distance_slab_id: undefined,
    slab_id: undefined,
    rate: undefined,
    fuel_pct: 0,
    packing: 0,
    handling: 0,
    gst_pct: 0,
    is_active: true,
  })

  // Resolve party id used by the form
  const effectivePartyId = useMemo(() => (typeof partyId === 'number' && Number.isFinite(partyId)) ? partyId : undefined, [partyId])

  const isValid = useMemo(() => {
    if (!effectivePartyId) return false
    if (!form.shipment_type) return false
    if (!form.mode_id || !form.service_type_id || !form.distance_slab_id || !form.slab_id) return false
    if (form.rate == null) return false
    return true
  }, [form, effectivePartyId])

  // Build all possible scenarios (cartesian product) for current masters
  const scenarios = useMemo(() => {
    const combos: Array<{
      shipment_type: ShipmentType
      mode_id: number
      service_type_id: number
      distance_slab_id: number
      slab_id: number
      existing?: PartyRateSlab
    }> = []
    for (const ship of SHIPMENT_TYPES) {
      for (const m of modes) {
        for (const s of services) {
          for (const d of distances) {
            for (const w of slabs) {
              const existing = rows.find(r => (
                String(r.shipment_type) === String(ship) &&
                Number(r.mode_id) === Number(m.id) &&
                Number(r.service_type_id) === Number(s.id) &&
                Number(r.distance_slab_id) === Number(d.id) &&
                Number(r.slab_id) === Number(w.id) &&
                r.is_active !== false
              ))
              combos.push({
                shipment_type: ship,
                mode_id: m.id,
                service_type_id: s.id,
                distance_slab_id: d.id,
                slab_id: w.id,
                existing,
              })
            }
          }
        }
      }
    }
    return combos
  }, [modes, services, distances, slabs, rows])

  // Quick counts for summary
  const scenariosCounts = useMemo(() => {
    const total = scenarios.length
    const active = scenarios.filter(s => !!s.existing).length
    const inactive = total - active
    return { total, active, inactive }
  }, [scenarios])

  function prefillFromScenario(s: {
    shipment_type: ShipmentType
    mode_id: number
    service_type_id: number
    distance_slab_id: number
    slab_id: number
    existing?: PartyRateSlab
  }) {
    const e = s.existing
    setForm({
      id: e?.id,
      shipment_type: s.shipment_type,
      mode_id: s.mode_id,
      service_type_id: s.service_type_id,
      distance_slab_id: s.distance_slab_id,
      slab_id: s.slab_id,
      rate: e?.rate,
      fuel_pct: e?.fuel_pct ?? 0,
      packing: (e as any)?.packing ?? 0,
      handling: e?.handling ?? 0,
      gst_pct: e?.gst_pct ?? 0,
      is_active: e?.is_active ?? true,
    })
    try { (document?.getElementById('rate') as HTMLInputElement | null)?.focus() } catch {}
  }

  async function fetchJSON<T>(url: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const res = await fetch(url, { cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : undefined })
    if (!res.ok) throw new Error(`${url} -> ${res.status}`)
    return res.json() as Promise<T>
  }

  async function loadMasters() {
    const [m, s, d, w] = await Promise.all([
      fetchJSON<{ data: Mode[] }>('\/api\/slabs\/modes'),
      fetchJSON<{ data: ServiceType[] }>('\/api\/slabs\/service-types'),
      fetchJSON<{ data: DistanceSlab[] }>('\/api\/slabs\/distance'),
      fetchJSON<{ data: WeightSlab[] }>('\/api\/slabs\/weight'),
    ])
    setModes(m.data || [])
    setServices(s.data || [])
    setDistances(d.data || [])
    setSlabs(w.data || [])
  }

  async function loadRows() {
    if (!effectivePartyId) { setRows([]); return }
    setLoading(true)
    setError(null)
    try {
      const url = `/api/party-rate-slabs?partyId=${effectivePartyId}`
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(url, { cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      if (res.status === 401) {
        setError('Unauthorized. Please login again to load party rate slabs.')
        setRows([])
        return
      }
      if (!res.ok) throw new Error(`Failed to load rows: ${res.status}`)
      const json = await res.json()
      const data = (json.data || []) as any[]
      // Hide soft-deleted rows (is_active = false)
      setRows(data.filter((r) => r.is_active !== false))
    } catch (e: any) {
      setError(e?.message || 'Error loading rows')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Load masters on mount
    loadMasters()
  }, [])

  // Reload masters when window regains focus (captures changes from Rate Masters page)
  useEffect(() => {
    const onFocus = () => { loadMasters().catch(() => {}) }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus)
      }
    }
  }, [])

  useEffect(() => {
    loadRows()
  }, [effectivePartyId])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError(null)
    try {
      // Safely parse numeric fields; treat empty string/NaN as undefined
      const toNum = (v: any): number | undefined => {
        if (v === null || v === undefined) return undefined
        const n = typeof v === 'number' ? v : Number(String(v).trim())
        return Number.isFinite(n) ? n : undefined
      }
      const modeId = toNum((form as any).mode_id)
      const serviceTypeId = toNum((form as any).service_type_id)
      const distanceSlabId = toNum((form as any).distance_slab_id)
      const slabId = toNum((form as any).slab_id)
      const rate = toNum((form as any).rate)

      // Client-side required validation mirroring API
      if (!effectivePartyId || !form.shipment_type || !modeId || !serviceTypeId || !distanceSlabId || !slabId || rate == null) {
        setError('Please fill all required fields: Shipment Type, Mode, Service Type, Distance Slab, Weight Slab, and Rate. (Party context missing)')
        setLoading(false)
        return
      }
      // If a row with same unique key exists, convert to update by setting id
      const existing = rows.find((r: any) => (
        Number(r.party_id) === Number(effectivePartyId) &&
        String(r.shipment_type) === String(form.shipment_type) &&
        Number(r.mode_id) === Number(modeId) &&
        Number(r.service_type_id) === Number(serviceTypeId) &&
        Number(r.distance_slab_id) === Number(distanceSlabId) &&
        Number(r.slab_id) === Number(slabId)
      ))

      const payload = {
        id: (form as any).id || existing?.id,
        // Required camelCase fields expected by API
        partyId: effectivePartyId,
        shipmentType: form.shipment_type,
        modeId,
        serviceTypeId,
        distanceSlabId,
        slabId,
        rate,
        // Ancillary snake_case fields also supported by API destructuring
        fuel_pct: toNum((form as any).fuel_pct) ?? 0,
        packing: toNum((form as any).packing) ?? 0,
        handling: toNum((form as any).handling) ?? 0,
        gst_pct: toNum((form as any).gst_pct) ?? 0,
        is_active: Boolean(form.is_active),
      }
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/party-rate-slabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      })
      if (res.status === 401) {
        setError('Unauthorized. Please login again to save party rate slabs.')
        return
      }
      if (!res.ok) {
        let serverMsg = ''
        try { const j = await res.json(); serverMsg = j?.error || j?.message || '' } catch {}
        throw new Error(serverMsg || `Save failed: ${res.status}`)
      }
      setForm({ shipment_type: 'DOCUMENT', fuel_pct: 0, packing: 0, handling: 0, gst_pct: 0, is_active: true })
      // lightweight success feedback
      try { console.info('Party rate slab saved successfully') } catch {}
      await loadRows()
    } catch (e: any) {
      setError(e?.message || 'Error saving')
    } finally {
      setLoading(false)
    }
  }

  const onEdit = (row: PartyRateSlab) => {
    setForm({ ...row })
  }

  const onDelete = async (row: PartyRateSlab) => {
    if (!confirm('Delete this mapping?')) return
    setLoading(true)
    setError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`/api/party-rate-slabs/${row.id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      if (res.status === 401) {
        setError('Unauthorized. Please login again to delete party rate slabs.')
        return
      }
      if (!res.ok) {
        let serverMsg = ''
        try { const j = await res.json(); serverMsg = j?.error || j?.message || '' } catch {}
        throw new Error(serverMsg || `Delete failed: ${res.status}`)
      }
      await loadRows()
    } catch (e: any) {
      setError(e?.message || 'Error deleting')
    } finally {
      setLoading(false)
    }
  }

  // Audit
  const [auditForId, setAuditForId] = useState<number | null>(null)
  const [audits, setAudits] = useState<AuditLog[]>([])
  const loadAudits = async (id: number) => {
    setAuditForId(id)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const res = await fetch(`/api/party-rate-slabs/audit?party_rate_slab_id=${id}`, { cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : undefined })
    if (res.status === 401) {
      setError('Unauthorized. Please login again to view audit logs.')
      setAudits([])
      return
    }
    if (res.ok) {
      const json = await res.json()
      setAudits(json.data || [])
    }
  }

  return (
    <div className="space-y-4">
      {/* Party selection removed: party is provided by context/page */}
      {!effectivePartyId && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          No party selected. Please open Party Rate Slabs from the Parties list action so a party is preselected.
        </div>
      )}

      {/* Form */}
      <form onSubmit={onSubmit} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end border rounded p-3">
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Shipment</label>
          <select className="border rounded px-2 py-1" value={form.shipment_type}
            onChange={(e) => setForm((f) => ({ ...f, shipment_type: e.target.value as ShipmentType }))}>
            {SHIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Mode</label>
          <select className="border rounded px-2 py-1" value={form.mode_id ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, mode_id: e.target.value === '' ? undefined : Number(e.target.value) }))}>
            <option value="">Select</option>
            {modes.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Service</label>
          <select className="border rounded px-2 py-1" value={form.service_type_id ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, service_type_id: e.target.value === '' ? undefined : Number(e.target.value) }))}>
            <option value="">Select</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Distance</label>
          <select className="border rounded px-2 py-1" value={form.distance_slab_id ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, distance_slab_id: e.target.value === '' ? undefined : Number(e.target.value) }))}>
            <option value="">Select</option>
            {distances.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Weight Slab</label>
          <select className="border rounded px-2 py-1" value={form.slab_id ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, slab_id: e.target.value === '' ? undefined : Number(e.target.value) }))}>
            <option value="">Select</option>
            {slabs.map((w) => <option key={w.id} value={w.id}>{w.slab_name}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Base Rate</label>
          <input type="number" className="border rounded px-2 py-1" value={form.rate ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value === '' ? undefined : Number(e.target.value) }))}
            placeholder="0.00" step="0.01"/>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Fuel %</label>
          <input type="number" className="border rounded px-2 py-1" value={form.fuel_pct ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, fuel_pct: e.target.value === '' ? 0 : Number(e.target.value) }))}
            placeholder="0" step="0.01"/>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Packing</label>
          <input type="number" className="border rounded px-2 py-1" value={(form as any).packing ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, packing: e.target.value === '' ? 0 : Number(e.target.value) }))}
            placeholder="0.00" step="0.01"/>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Handling</label>
          <input type="number" className="border rounded px-2 py-1" value={form.handling ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, handling: e.target.value === '' ? 0 : Number(e.target.value) }))}
            placeholder="0.00" step="0.01"/>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">GST %</label>
          <input type="number" className="border rounded px-2 py-1" value={form.gst_pct ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, gst_pct: e.target.value === '' ? 0 : Number(e.target.value) }))}
            placeholder="0" step="0.01"/>
        </div>
        <div className="flex items-center gap-2">
          <input id="is_active" type="checkbox" checked={Boolean(form.is_active)}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}/>
          <label htmlFor="is_active" className="text-sm">Active</label>
        </div>
        <div>
          <button type="submit" disabled={!isValid || loading} className="bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50">
            {(form as any).id ? 'Update' : 'Add'}
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 border text-left">Shipment</th>
              <th className="p-2 border text-left">Mode</th>
              <th className="p-2 border text-left">Service</th>
              <th className="p-2 border text-left">Distance</th>
              <th className="p-2 border text-left">Weight Slab</th>
              <th className="p-2 border text-right">Rate</th>
              <th className="p-2 border text-right">Fuel%</th>
              <th className="p-2 border text-right">Packing</th>
              <th className="p-2 border text-right">Handling</th>
              <th className="p-2 border text-right">GST%</th>
              <th className="p-2 border text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="p-2 border" colSpan={11}>Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td className="p-2 border" colSpan={11}>No mappings found</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 border">{r.shipment_type}</td>
                <td className="p-2 border">{modes.find((m) => m.id === r.mode_id)?.title || r.mode_id}</td>
                <td className="p-2 border">{services.find((s) => s.id === r.service_type_id)?.title || r.service_type_id}</td>
                <td className="p-2 border">{distances.find((d) => d.id === r.distance_slab_id)?.title || r.distance_slab_id}</td>
                <td className="p-2 border">{slabs.find((w) => w.id === r.slab_id)?.slab_name || r.slab_id}</td>
                <td className="p-2 border text-right">{Number(r.rate).toFixed(2)}</td>
                <td className="p-2 border text-right">{Number(r.fuel_pct || 0).toFixed(2)}</td>
                <td className="p-2 border text-right">{Number((r as any).packing || 0).toFixed(2)}</td>
                <td className="p-2 border text-right">{Number(r.handling || 0).toFixed(2)}</td>
                <td className="p-2 border text-right">{Number(r.gst_pct || 0).toFixed(2)}</td>
                <td className="p-2 border space-x-2">
                  <button className="text-blue-600 hover:underline" onClick={() => onEdit(r)}>Edit</button>
                  <button className="text-red-600 hover:underline" onClick={() => onDelete(r)}>Delete</button>
                  <button className="text-gray-700 hover:underline" onClick={() => loadAudits(r.id)}>Audit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* All Scenarios Toggle and List */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-medium">All Scenarios (combinations)</div>
            <div className="text-xs text-gray-600 mt-1">
              Total: {scenariosCounts.total} 
              <span className="ml-3 text-green-700">Active: {scenariosCounts.active}</span>
              <span className="ml-3 text-gray-600">Inactive: {scenariosCounts.inactive}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="text-sm px-2 py-1 border rounded"
              onClick={async () => { await loadMasters(); }}
              type="button"
              title="Refresh Rate Masters"
            >
              Refresh
            </button>
            <button
              className="text-sm px-2 py-1 border rounded"
              onClick={async () => { if (!showAllScenarios) { await loadMasters() }; setShowAllScenarios(v => !v) }}
              type="button"
            >
              {showAllScenarios ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {showAllScenarios && (
          <div className="max-h-[420px] overflow-auto border rounded">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-2 border text-left">Shipment</th>
                  <th className="p-2 border text-left">Mode</th>
                  <th className="p-2 border text-left">Service</th>
                  <th className="p-2 border text-left">Distance</th>
                  <th className="p-2 border text-left">Weight Slab</th>
                  <th className="p-2 border text-left">Status</th>
                  <th className="p-2 border text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((sc, idx) => (
                  <tr key={`${sc.shipment_type}-${sc.mode_id}-${sc.service_type_id}-${sc.distance_slab_id}-${sc.slab_id}-${idx}`} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2 border">{sc.shipment_type}</td>
                    <td className="p-2 border">{modes.find(m => m.id === sc.mode_id)?.title || sc.mode_id}</td>
                    <td className="p-2 border">{services.find(s => s.id === sc.service_type_id)?.title || sc.service_type_id}</td>
                    <td className="p-2 border">{distances.find(d => d.id === sc.distance_slab_id)?.title || sc.distance_slab_id}</td>
                    <td className="p-2 border">{slabs.find(w => w.id === sc.slab_id)?.slab_name || sc.slab_id}</td>
                    <td className="p-2 border">
                      <span className={sc.existing ? 'text-green-700' : 'text-gray-600'}>
                        {sc.existing ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-2 border">
                      <button className="text-blue-600 hover:underline" onClick={() => prefillFromScenario(sc)}>
                        {sc.existing ? 'Edit' : 'Add'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Drawer */}
      {auditForId && (
        <div className="border rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Audit Logs for ID {auditForId}</div>
            <button className="text-sm text-gray-600" onClick={() => { setAuditForId(null); setAudits([]) }}>Close</button>
          </div>
          <div className="max-h-64 overflow-auto text-xs">
            {audits.length === 0 ? (
              <div className="text-gray-500">No audit records.</div>
            ) : (
              <table className="w-full text-xs border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 border text-left">When</th>
                    <th className="p-2 border text-left">Action</th>
                    <th className="p-2 border text-left">By</th>
                    <th className="p-2 border text-left">Before</th>
                    <th className="p-2 border text-left">After</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => (
                    <tr key={a.id} className="odd:bg-white even:bg-gray-50">
                      <td className="p-2 border">{new Date(a.changed_at).toLocaleString()}</td>
                      <td className="p-2 border">{a.action}</td>
                      <td className="p-2 border">{a.changed_by || '-'}</td>
                      <td className="p-2 border"><pre className="whitespace-pre-wrap">{JSON.stringify(a.before_data, null, 2)}</pre></td>
                      <td className="p-2 border"><pre className="whitespace-pre-wrap">{JSON.stringify(a.after_data, null, 2)}</pre></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  )
}
