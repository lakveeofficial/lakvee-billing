'use client'

import { useEffect, useMemo, useState } from 'react'

type PackageType = 'DOCUMENT' | 'NON_DOCUMENT'

interface Region { id: number; name: string }
interface Slab { id: number; slab_name: string; min_weight_grams: number; max_weight_grams: number }
interface Row {
  id?: number
  region_id: number | null
  region_name?: string
  package_type: PackageType
  slab_id: number
  slab_name?: string
  base_rate: number
  extra_per_1000g?: number
  notes?: string
}

export default function QuotationDefaultsPage() {
  const [regions, setRegions] = useState<Region[]>([])
  const [slabs, setSlabs] = useState<Slab[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [filter, setFilter] = useState<{ regionId: string; packageType: PackageType | '' }>({ regionId: '', packageType: '' })

  async function load() {
    const [r, s] = await Promise.all([
      fetch('/api/regions').then(r => r.json()),
      fetch('/api/slabs/weight').then(r => r.json())
    ])
    setRegions(r.data || [])
    setSlabs((s.data || []).map((x: any) => ({ id: x.id, slab_name: x.slab_name, min_weight_grams: x.min_weight_grams, max_weight_grams: x.max_weight_grams })))
    await refresh()
  }

  async function refresh() {
    const url = new URLSearchParams()
    if (filter.regionId) url.set('regionId', filter.regionId)
    const res = await fetch(`/api/quotations/defaults?${url}`)
    const json = await res.json()
    setRows(json.data || [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => { refresh() }, [filter.regionId])

  function addBlank() {
    setRows(rs => [{ region_id: Number(filter.regionId) || null, package_type: 'DOCUMENT', slab_id: slabs?.[0]?.id, base_rate: 0 }, ...rs])
  }

  async function save(r: Row) {
    const body = { ...r, extra_per_1000g: r.extra_per_1000g || 0, notes: r.notes || null }
    await fetch('/api/quotations/defaults', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    refresh()
  }
  async function remove(id?: number) {
    if (!id) return
    await fetch(`/api/quotations/defaults?id=${id}`, { method: 'DELETE' })
    refresh()
  }

  const filtered = useMemo(() => rows.filter(r => (filter.packageType ? r.package_type === filter.packageType : true)), [rows, filter.packageType])

  const slabLabel = (id: number) => slabs.find(s => s.id === id)?.slab_name || id

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Default Quotations</h1>
        <div className="flex gap-2">
          <button className="bg-primary-600 text-white px-4 py-2 rounded" onClick={addBlank}>Add Row</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm text-slate-600">Region</label>
          <select className="border rounded px-3 py-2 w-full" value={filter.regionId} onChange={e => setFilter(f => ({ ...f, regionId: e.target.value }))}>
            <option value="">All</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600">Package Type</label>
          <select className="border rounded px-3 py-2 w-full" value={filter.packageType} onChange={e => setFilter(f => ({ ...f, packageType: e.target.value as any }))}>
            <option value="">All</option>
            <option value="DOCUMENT">Document</option>
            <option value="NON_DOCUMENT">Non Document</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-3">Region</th>
              <th className="p-3">Package</th>
              <th className="p-3">Slab</th>
              <th className="p-3">Base Rate</th>
              <th className="p-3">Extra / 1000g</th>
              <th className="p-3">Notes</th>
              <th className="p-3 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-3">
                  <select className="border rounded px-2 py-1" value={r.region_id ?? ''} onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, region_id: e.target.value ? Number(e.target.value) : null } : x))}>
                    <option value="">—</option>
                    {regions.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <select className="border rounded px-2 py-1" value={r.package_type} onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, package_type: e.target.value as PackageType } : x))}>
                    <option value="DOCUMENT">Document</option>
                    <option value="NON_DOCUMENT">Non Document</option>
                  </select>
                </td>
                <td className="p-3">
                  <select className="border rounded px-2 py-1" value={r.slab_id} onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, slab_id: Number(e.target.value) } : x))}>
                    {slabs.map(s => <option key={s.id} value={s.id}>{s.slab_name}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <input type="number" className="border rounded px-2 py-1 w-28" value={r.base_rate} onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, base_rate: Number(e.target.value) } : x))} />
                </td>
                <td className="p-3">
                  <input type="number" className="border rounded px-2 py-1 w-28" value={r.extra_per_1000g || 0} onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, extra_per_1000g: Number(e.target.value) } : x))} />
                </td>
                <td className="p-3">
                  <input className="border rounded px-2 py-1 w-72" value={r.notes || ''} onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, notes: e.target.value } : x))} />
                </td>
                <td className="p-3 flex gap-2">
                  <button className="px-3 py-1 bg-emerald-600 text-white rounded" onClick={() => save(r)}>Save</button>
                  {r.id && <button className="px-3 py-1 bg-rose-600 text-white rounded" onClick={() => remove(r.id)}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
