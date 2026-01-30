'use client'

import { useEffect, useState } from 'react'

interface Operator { id?: number; user_id?: number; username?: string; email?: string; booking_rights?: any; bill_item_preferences?: any; bill_template?: string }
interface User { id: number; username: string; email: string }

export default function OperatorsPage() {
  const [rows, setRows] = useState<Operator[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [form, setForm] = useState<Operator>({})

  async function load() {
    const [ops, us] = await Promise.all([
      fetch('/api/operators').then(r => r.json()),
      fetch('/api/auth/users').then(r => r.json()).catch(() => ({ data: [] }))
    ])
    setRows(ops.data || [])
    setUsers(us.data || [])
  }
  useEffect(() => { load() }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const body = { ...form, booking_rights: form.booking_rights || {}, bill_item_preferences: form.bill_item_preferences || {}, bill_template: form.bill_template || '' }
    await fetch('/api/operators', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setForm({})
    load()
  }

  async function remove(id?: number) {
    if (!id) return
    await fetch(`/api/operators?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Operators</h1>

      <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-slate-600">User</label>
          <select className="border rounded px-3 py-2 w-full" value={form.user_id ?? ''} onChange={e => setForm(f => ({ ...f, user_id: e.target.value ? Number(e.target.value) : undefined }))} required>
            <option value="">Select user</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.email})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600">Bill Template (name)</label>
          <input className="border rounded px-3 py-2 w-full" value={form.bill_template || ''} onChange={e => setForm(f => ({ ...f, bill_template: e.target.value }))} />
        </div>
        <div className="md:col-span-3">
          <button className="bg-primary-600 text-white px-4 py-2 rounded">Save</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-3">ID</th>
              <th className="p-3">User</th>
              <th className="p-3">Bill Template</th>
              <th className="p-3 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map(op => (
              <tr key={op.id} className="border-t">
                <td className="p-3">{op.id}</td>
                <td className="p-3">{op.username || op.email || op.user_id}</td>
                <td className="p-3">{op.bill_template || '-'}</td>
                <td className="p-3 flex gap-2">
                  <button className="px-3 py-1 bg-rose-600 text-white rounded" onClick={() => remove(op.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
