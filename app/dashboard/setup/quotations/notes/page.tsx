"use client"

import { useEffect, useState } from 'react'

interface Note { id?: number; title?: string; body: string }

export default function QuotationNotesPage() {
  const [rows, setRows] = useState<Note[]>([])
  const [form, setForm] = useState<Note>({ body: '' })

  async function load() {
    const res = await fetch('/api/quotations/notes')
    const json = await res.json()
    setRows(json.data || [])
  }
  useEffect(() => { load() }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/quotations/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({ body: '' })
    load()
  }

  async function edit(n: Note) {
    setForm(n)
  }

  async function remove(id?: number) {
    if (!id) return
    await fetch(`/api/quotations/notes?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Quotation Notes</h1>

      <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-slate-600">Title (optional)</label>
          <input className="border rounded px-3 py-2 w-full" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-slate-600">Body</label>
          <textarea className="border rounded px-3 py-2 w-full" rows={3} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} required />
        </div>
        <div className="md:col-span-3">
          <button className="bg-primary-600 text-white px-4 py-2 rounded">{form.id ? 'Update' : 'Add'}</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-3 w-16">ID</th>
              <th className="p-3 w-80">Title</th>
              <th className="p-3">Body</th>
              <th className="p-3 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(n => (
              <tr key={n.id} className="border-t align-top">
                <td className="p-3">{n.id}</td>
                <td className="p-3">{n.title}</td>
                <td className="p-3 whitespace-pre-wrap">{n.body}</td>
                <td className="p-3 flex gap-2">
                  <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => edit(n)}>Edit</button>
                  <button className="px-3 py-1 bg-rose-600 text-white rounded" onClick={() => remove(n.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
