'use client'

import { useEffect, useState } from 'react'

interface Sms { id: number; name: string; template: string }

export default function SmsFormatsPage() {
  const [rows, setRows] = useState<Sms[]>([])
  const [form, setForm] = useState<Partial<Sms>>({})

  async function load() {
    const res = await fetch('/api/sms-formats')
    const json = await res.json()
    setRows(json.data || [])
  }
  useEffect(() => { load() }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/sms-formats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({})
    load()
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">SMS Formats</h1>

      <form onSubmit={save} className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-slate-600">Name</label>
            <input className="border rounded px-3 py-2 w-full" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-600">Template</label>
            <textarea className="border rounded px-3 py-2 w-full" rows={3} value={form.template || ''} onChange={e => setForm(f => ({ ...f, template: e.target.value }))} required />
          </div>
        </div>
        <div>
          <button className="bg-primary-600 text-white px-4 py-2 rounded">Save</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-3 w-24">ID</th>
              <th className="p-3 w-64">Name</th>
              <th className="p-3">Template</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-3">{r.id}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3 whitespace-pre-wrap">{r.template}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
