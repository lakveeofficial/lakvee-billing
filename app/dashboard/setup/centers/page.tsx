'use client'

import { useEffect, useState } from 'react'
import { getCityName } from '@/lib/indiaData'

interface Region { id: number; name: string }
interface Center { id: number; state: string; city: string; region_id: number | null; is_active: boolean }

export default function CentersPage() {
  const [regions, setRegions] = useState<Region[]>([])
  const [rows, setRows] = useState<Center[]>([])
  const [form, setForm] = useState<Partial<Center>>({ is_active: true })

  async function load() {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const [r1, r2] = await Promise.all([
        fetch('/api/regions', { headers }).then(r => r.json()),
        fetch('/api/centers', { headers }).then(r => r.json())
      ])

      setRegions(r1.success ? r1.data : [])
      setRows(r2.success ? r2.data : [])

      if (!r1.success) {
        console.error('Failed to load regions:', r1.error)
      }
      if (!r2.success) {
        console.error('Failed to load centers:', r2.error)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/centers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form)
      })

      const result = await res.json()
      if (result.success) {
        alert('Center created successfully!')
        setForm({ is_active: true })
        load()
      } else {
        alert('Failed to create center: ' + result.error)
      }
    } catch (error) {
      console.error('Error creating center:', error)
      alert('Failed to create center. Please try again.')
    }
  }

  async function saveRow(c: Center) {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`/api/centers/${c.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(c)
      })

      const result = await res.json()
      if (result.success) {
        alert('Center updated successfully!')
        load()
      } else {
        alert('Failed to update center: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating center:', error)
      alert('Failed to update center. Please try again.')
    }
  }

  async function remove(id: number) {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`/api/centers/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      })

      const result = await res.json()
      if (result.success) {
        alert('Center deleted successfully!')
        load()
      } else {
        alert('Failed to delete center: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting center:', error)
      alert('Failed to delete center. Please try again.')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Centers</h1>

      <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-sm text-slate-600">State</label>
          <input className="border rounded px-3 py-2 w-full" value={form.state || ''} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm text-slate-600">City</label>
          <input className="border rounded px-3 py-2 w-full" value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm text-slate-600">Region</label>
          <select className="border rounded px-3 py-2 w-full" value={form.region_id ?? ''} onChange={e => setForm(f => ({ ...f, region_id: e.target.value ? Number(e.target.value) : null }))}>
            <option value="">—</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <button className="bg-primary-600 text-white px-4 py-2 rounded">Add</button>
      </form>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-3">ID</th>
              <th className="p-3">State</th>
              <th className="p-3">City</th>
              <th className="p-3">Region</th>
              <th className="p-3">Active</th>
              <th className="p-3 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.id}</td>
                <td className="p-3"><input className="border rounded px-2 py-1" value={c.state} onChange={e => setRows(rs => rs.map(x => x.id === c.id ? { ...x, state: e.target.value } : x))} /></td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <input className="border rounded px-2 py-1 w-20" value={c.city} onChange={e => setRows(rs => rs.map(x => x.id === c.id ? { ...x, city: e.target.value } : x))} />
                    <span className="text-slate-500 text-xs text-nowrap">({getCityName(c.city)})</span>
                  </div>
                </td>
                <td className="p-3">
                  <select className="border rounded px-2 py-1" value={c.region_id ?? ''} onChange={e => setRows(rs => rs.map(x => x.id === c.id ? { ...x, region_id: e.target.value ? Number(e.target.value) : null } : x))}>
                    <option value="">—</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </td>
                <td className="p-3"><input type="checkbox" checked={c.is_active} onChange={e => setRows(rs => rs.map(x => x.id === c.id ? { ...x, is_active: e.target.checked } : x))} /></td>
                <td className="p-3 flex gap-2">
                  <button className="px-3 py-1 bg-emerald-600 text-white rounded" onClick={() => saveRow(c)}>Save</button>
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
