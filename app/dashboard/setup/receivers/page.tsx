'use client'

import { useEffect, useState } from 'react'

interface Receiver { id?: number; name: string; city?: string; contact?: string }

export default function ReceiversPage() {
  const [rows, setRows] = useState<Receiver[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(24)
  const [total, setTotal] = useState(0)
  const [form, setForm] = useState<Receiver>({ name: '' })

  async function load(p = page, s = search) {
    const params = new URLSearchParams({ page: String(p), limit: String(limit) })
    if (s) params.set('search', s)
    const res = await fetch(`/api/receivers?${params}`)
    const json = await res.json()
    setRows(json.data || [])
    setTotal(json.pagination?.total || 0)
  }
  useEffect(() => { load() }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/receivers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({ name: '' })
    load(1, '')
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Receivers</h1>
        <div className="flex gap-2 items-center">
          <input className="border rounded px-3 py-2" placeholder="Search name/city/contact" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="px-3 py-2 rounded bg-primary-600 text-white" onClick={() => { setPage(1); load(1, search) }}>Search</button>
          <button className="px-3 py-2 rounded" onClick={() => { setSearch(''); setPage(1); load(1, '') }}>Reset</button>
        </div>
      </div>

      <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-sm text-slate-600">Name</label>
          <input className="border rounded px-3 py-2 w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm text-slate-600">City</label>
          <input className="border rounded px-3 py-2 w-full" value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm text-slate-600">Contact</label>
          <input className="border rounded px-3 py-2 w-full" value={form.contact || ''} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
        </div>
        <button className="bg-primary-600 text-white px-4 py-2 rounded">Add</button>
      </form>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-3 w-24">ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">City</th>
              <th className="p-3">Contact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.id}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.city}</td>
                <td className="p-3">{r.contact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Total: {total}</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => { setPage(p => { const np = Math.max(1, p-1); load(np, search); return np }) }} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
          <span className="px-2 py-1">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => { setPage(p => { const np = Math.min(totalPages, p+1); load(np, search); return np }) }} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  )
}
