'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Save, Edit } from 'lucide-react'

interface PackageType {
  id: string
  name: string
  ranges: WeightRange[]
  extraWeight?: number
  unit: string
}

interface WeightRange {
  weight: number
  unit: string
}

interface PartyPackageTypesModalProps {
  isOpen: boolean
  onClose: () => void
  partyId: number
  partyName: string
}

export default function PartyPackageTypesModal({ isOpen, onClose, partyId, partyName }: PartyPackageTypesModalProps) {
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && partyId) {
      fetchPartyPackageTypes()
    }
  }, [isOpen, partyId])

  const fetchPartyPackageTypes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/parties/${partyId}/package-types`)
      const data = await response.json()

      if (data.success) {
        setPackageTypes((data.data && data.data.length > 0) ? data.data : getDefaultPackageTypes())
      } else {
        setPackageTypes(getDefaultPackageTypes())
      }
    } catch (error) {
      console.error('Error fetching party package types:', error)
      setPackageTypes(getDefaultPackageTypes())
    } finally {
      setLoading(false)
    }
  }

  const getDefaultPackageTypes = (): PackageType[] => [
    {
      id: 'dox',
      name: 'DOX',
      ranges: [
        { weight: 100, unit: 'gm' },
        { weight: 250, unit: 'gm' },
        { weight: 500, unit: 'gm' },
        { weight: 750, unit: 'gm' },
        { weight: 1000, unit: 'gm' }
      ],
      extraWeight: 1000,
      unit: 'gm'
    },
    {
      id: 'parcel',
      name: 'Parcel',
      ranges: [
        { weight: 1000, unit: 'gm' }
      ],
      extraWeight: 1000,
      unit: 'kg'
    }
  ]

  const addPackageType = () => {
    const newPackageType: PackageType = {
      id: `pkg_${Date.now()}`,
      name: '',
      ranges: [{ weight: 100, unit: 'gm' }],
      unit: 'gm'
    }
    setPackageTypes([...packageTypes, newPackageType])
  }

  const removePackageType = (id: string) => {
    setPackageTypes(packageTypes.filter(pkg => pkg.id !== id))
  }

  const updatePackageType = (id: string, updates: Partial<PackageType>) => {
    setPackageTypes(packageTypes.map(pkg =>
      pkg.id === id ? { ...pkg, ...updates } : pkg
    ))
  }

  const addWeightRange = (packageId: string) => {
    const packageType = packageTypes.find(pkg => pkg.id === packageId)
    if (packageType) {
      const newRange = { weight: 100, unit: packageType.unit }
      updatePackageType(packageId, {
        ranges: [...packageType.ranges, newRange]
      })
    }
  }

  const removeWeightRange = (packageId: string, rangeIndex: number) => {
    const packageType = packageTypes.find(pkg => pkg.id === packageId)
    if (packageType && packageType.ranges.length > 1) {
      updatePackageType(packageId, {
        ranges: packageType.ranges.filter((_, index) => index !== rangeIndex)
      })
    }
  }

  const updateWeightRange = (packageId: string, rangeIndex: number, weight: number) => {
    const packageType = packageTypes.find(pkg => pkg.id === packageId)
    if (packageType) {
      const updatedRanges = [...packageType.ranges]
      updatedRanges[rangeIndex] = { ...updatedRanges[rangeIndex], weight }
      updatePackageType(packageId, { ranges: updatedRanges })
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/parties/${partyId}/package-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageTypes })
      })

      const data = await response.json()
      if (data.success) {
        onClose()
      } else {
        alert('Failed to save package types: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving package types:', error)
      alert('Failed to save package types')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Edit className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Party Package Type</h2>
              <p className="text-sm text-slate-500">{partyName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-500">Loading...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {packageTypes.map((packageType) => (
                <div key={packageType.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-medium">📦</span>
                      <input
                        type="text"
                        value={packageType.name}
                        onChange={(e) => updatePackageType(packageType.id, { name: e.target.value })}
                        className="text-lg font-semibold bg-transparent border-none outline-none"
                        placeholder="Package Type Name"
                      />
                      <select
                        value={packageType.unit}
                        onChange={(e) => updatePackageType(packageType.id, { unit: e.target.value })}
                        className="px-2 py-1 border border-slate-300 rounded text-sm"
                      >
                        <option value="gm">GM</option>
                        <option value="kg">KG</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removePackageType(packageType.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete Package Type"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Weight Ranges */}
                  <div className="space-y-2">
                    {packageType.ranges.map((range, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="number"
                          value={range.weight}
                          onChange={(e) => updateWeightRange(packageType.id, index, parseInt(e.target.value) || 0)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-xl"
                          placeholder="Weight"
                        />
                        <span className="text-sm text-slate-500 w-8">{packageType.unit}</span>
                        <button
                          onClick={() => removeWeightRange(packageType.id, index)}
                          disabled={packageType.ranges.length <= 1}
                          className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => addWeightRange(packageType.id)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Extra Weight */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">Extra Weight</span>
                      <input
                        type="number"
                        value={packageType.extraWeight || ''}
                        onChange={(e) => updatePackageType(packageType.id, {
                          extraWeight: parseInt(e.target.value) || undefined
                        })}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                        placeholder="1000"
                      />
                      <span className="text-sm text-slate-500">{packageType.unit}</span>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addPackageType}
                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Package Type
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
