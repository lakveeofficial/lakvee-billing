'use client'

import { useEffect, useMemo, useState } from 'react'
import type { WeightSlab } from '@/types/rate-slabs'

export default function WeightSlabsManager() {
  const [data, setData] = useState<WeightSlab[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<Partial<WeightSlab>>({
    slab_name: '',
    min_weight_grams: undefined,
    max_weight_grams: undefined,
    is_active: true,
  })

  const isValid = useMemo(() => {
    if (!form.slab_name?.trim()) return false
    if (form.min_weight_grams == null || form.max_weight_grams == null) return false
    if ((form.min_weight_grams as number) < 0) return false
    if ((form.max_weight_grams as number) <= (form.min_weight_grams as number)) return false
    return true
  }, [form])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/slabs/weight', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const json = await res.json()
      setData(json.data || [])
    } catch (e: any) {
      setError(e?.message || 'Error loading data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/slabs/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          slab_name: form.slab_name,
          min_weight_grams: Number(form.min_weight_grams),
          max_weight_grams: Number(form.max_weight_grams),
          is_active: Boolean(form.is_active),
        }),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      setForm({ slab_name: '', min_weight_grams: undefined, max_weight_grams: undefined, is_active: true })
      await load()
    } catch (e: any) {
      setError(e?.message || 'Error saving')
    } finally {
      setLoading(false)
    }
  }

  const onEdit = (row: WeightSlab) => {
    setForm({ ...row })
  }

  return (
    <div className="border rounded-md p-3">
      {error && (
        <div className="mb-3 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Slab Name</label>
          <input
            className="border rounded px-2 py-1"
            value={form.slab_name || ''}
            onChange={(e) => setForm((f) => ({ ...f, slab_name: e.target.value }))}
            placeholder="e.g., 0-100g"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Min (g)</label>
          <input
            type="number"
            className="border rounded px-2 py-1"
            value={form.min_weight_grams ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, min_weight_grams: e.target.value === '' ? undefined : Number(e.target.value) }))}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Max (g)</label>
          <input
            type="number"
            className="border rounded px-2 py-1"
            value={form.max_weight_grams ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, max_weight_grams: e.target.value === '' ? undefined : Number(e.target.value) }))}
            placeholder="100"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="is_active"
            type="checkbox"
            checked={Boolean(form.is_active)}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          />
          <label htmlFor="is_active" className="text-sm">Active</label>
        </div>
        <div>
          <button
            type="submit"
            disabled={!isValid || loading}
            className="bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50"
          >
            {form.id ? 'Update' : 'Add'}
          </button>
        </div>
      </form>

      <div className="overflow-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 border">Name</th>
              <th className="text-left p-2 border">Min (g)</th>
              <th className="text-left p-2 border">Max (g)</th>
              <th className="text-left p-2 border">Active</th>
              <th className="text-left p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="p-2 border" colSpan={5}>Loading…</td></tr>
            )}
            {!loading && data.length === 0 && (
              <tr><td className="p-2 border" colSpan={5}>No slabs found</td></tr>
            )}
            {data.map((row) => (
              <tr key={row.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 border">{row.slab_name}</td>
                <td className="p-2 border">{row.min_weight_grams}</td>
                <td className="p-2 border">{row.max_weight_grams}</td>
                <td className="p-2 border">{row.is_active ? 'Yes' : 'No'}</td>
                <td className="p-2 border">
                  <button className="px-2 py-1 text-blue-600 hover:underline" onClick={() => onEdit(row)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
