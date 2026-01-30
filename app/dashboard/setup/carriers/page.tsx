'use client'

import { useEffect, useState } from 'react'

interface Carrier { id: number; name: string; is_active: boolean }

export default function CarriersPage() {
  const [rows, setRows] = useState<Carrier[]>([])
  const [name, setName] = useState('')

  async function load() {
    const res = await fetch('/api/carriers')
    const json = await res.json()
    setRows(json.data || [])
  }
  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/carriers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, is_active: true }) })
    setName('')
    load()
  }

  async function save(c: Carrier) {
    await fetch('/api/carriers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })
    load()
  }

  async function remove(id: number) {
    await fetch(`/api/carriers?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Carriers</h1>

      <form onSubmit={add} className="flex gap-3 items-end">
        <div>
          <label className="block text-sm text-slate-600">Name</label>
          <input className="border rounded px-3 py-2" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <button className="bg-primary-600 text-white px-4 py-2 rounded">Add</button>
      </form>

      <div className="bg-white rounded-xl shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-3">ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Active</th>
              <th className="p-3 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.id}</td>
                <td className="p-3"><input className="border rounded px-2 py-1" value={c.name} onChange={e => setRows(rs => rs.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))} /></td>
                <td className="p-3"><input type="checkbox" checked={c.is_active} onChange={e => setRows(rs => rs.map(x => x.id === c.id ? { ...x, is_active: e.target.checked } : x))} /></td>
                <td className="p-3 flex gap-2">
                  <button className="px-3 py-1 bg-emerald-600 text-white rounded" onClick={() => save(c)}>Save</button>
                  <button className="px-3 py-1 bg-rose-600 text-white rounded" onClick={() => remove(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
