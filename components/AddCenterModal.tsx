"use client"

import { useEffect, useMemo, useState } from "react"
import { X, Plus, Search } from "lucide-react"
import { INDIAN_STATES, State as IndiaState, City as IndiaCity } from "@/lib/indiaData"

interface Region { id: number; name: string }

interface AddCenterModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (created: { id: number; state: string; city: string; region_id: number | null }) => void
  initialStateCode?: string
}

export default function AddCenterModal({ isOpen, onClose, onSaved, initialStateCode }: AddCenterModalProps) {
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [infoMsg, setInfoMsg] = useState<string>("")

  const [name, setName] = useState("") // City/Town name
  const [district, setDistrict] = useState("")
  const [stateCode, setStateCode] = useState(initialStateCode || "")
  const [zipcodes, setZipcodes] = useState("")
  const [regionId, setRegionId] = useState<string>("")
  const [country, setCountry] = useState("INDIA")

  const selectedState: IndiaState | undefined = useMemo(
    () => INDIAN_STATES.find(s => s.code === stateCode),
    [stateCode]
  )

  useEffect(() => {
    if (!isOpen) return
    setErrorMsg("")
    setInfoMsg("")
    void loadRegions()
  }, [isOpen])

  async function loadRegions() {
    try {
      setLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: HeadersInit = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const res = await fetch('/api/regions', {
        headers,
        credentials: 'include'
      })
      const data = await res.json()
      if (data.success) {
        setRegions(data.data?.map((r: any) => ({ id: r.id, name: r.name })) || [])
      } else {
        console.error('Failed to load regions:', data.error)
      }
    } catch (e) {
      console.error('Error loading regions', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setErrorMsg("")
    if (!name || name.trim().length < 2) {
      setErrorMsg('Please enter a valid Name (min 2 characters).')
      return
    }
    if (!stateCode) {
      setErrorMsg('Please select a State.')
      return
    }

    try {
      setSaving(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/centers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          state: stateCode,
          city: name,
          region_id: regionId ? Number(regionId) : null,
          district: district || null,
          zipcodes: zipcodes || null,
          country,
          is_active: true,
        })
      })

      const data = await res.json()
      if (data.success) {
        const created = data.data
        if (onSaved) onSaved(created)
        // reset and close
        setName("")
        setDistrict("")
        setZipcodes("")
        setRegionId("")
        if (!initialStateCode) setStateCode("")
        setInfoMsg('Center saved successfully!')
        // Close shortly after success to provide feedback
        setTimeout(() => {
          setInfoMsg("")
          onClose()
        }, 600)
      } else {
        setErrorMsg('Failed to save center: ' + (data.error || 'Unknown error'))
      }
    } catch (e) {
      console.error('Error saving center', e)
      setErrorMsg('Failed to save center. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-xl overflow-hidden text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded">
              <Plus className="h-5 w-5 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold">Add Center (City/Town)</h3>
          </div>
          <button className="p-1 hover:bg-slate-100 rounded" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 grid grid-cols-2 gap-3">
          {(errorMsg || infoMsg) && (
            <div className={`col-span-2 text-sm mb-1 ${errorMsg ? 'text-red-700 bg-red-50 border border-red-200' : 'text-green-700 bg-green-50 border border-green-200'} px-3 py-2 rounded`}>
              {errorMsg || infoMsg}
            </div>
          )}
          <div className="col-span-1">
            <label className="block text-sm text-slate-700 mb-1">Name *</label>
            <input
              placeholder="e.g. Rajkot"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm text-slate-700 mb-1">District</label>
            <input
              placeholder="Select District"
              value={district}
              onChange={e => setDistrict(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="col-span-1">
            <label className="block text-sm text-slate-700 mb-1">State *</label>
            <select
              value={stateCode}
              onChange={e => setStateCode(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map(s => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-1">
            <label className="block text-sm text-slate-700 mb-1">zipcode</label>
            <input
              placeholder="e.g 360001, 360002"
              value={zipcodes}
              onChange={e => setZipcodes(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="col-span-1">
            <label className="block text-sm text-slate-700 mb-1">Region</label>
            <select
              value={regionId}
              onChange={e => setRegionId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {regions.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-sm text-slate-700 mb-1">Country</label>
            <select value={country} onChange={e => setCountry(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="INDIA">INDIA</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button className="px-4 py-2 text-slate-600" onClick={onClose}>Cancel</button>
          <button
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
