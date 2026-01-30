'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Edit, Save, Trash2 } from 'lucide-react'
import { usePackageTypes } from './SharedPackageTypesContext'

interface WeightRange {
  id?: number
  weight: string
  unit: string
}

interface PackageType {
  name: string
  unit: string
  ranges: WeightRange[]
  extraWeight?: string
}

interface PackageTypesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PackageTypesModal({ isOpen, onClose }: PackageTypesModalProps) {
  const { packageTypes, updatePackageTypes } = usePackageTypes()

  const [newItemName, setNewItemName] = useState('')
  const [editingType, setEditingType] = useState<string | null>(null)

  if (!isOpen) return null

  const addWeightRange = (packageName: string) => {
    updatePackageTypes(prev => prev.map(pkg => 
      pkg.name === packageName 
        ? { ...pkg, ranges: [...pkg.ranges, { weight: '', unit: 'g' }] }
        : pkg
    ))
  }

  const removeWeightRange = (packageName: string, index: number) => {
    updatePackageTypes(prev => prev.map(pkg => 
      pkg.name === packageName 
        ? { ...pkg, ranges: pkg.ranges.filter((_, i) => i !== index) }
        : pkg
    ))
  }

  const updateWeightRange = (packageName: string, index: number, weight: string) => {
    updatePackageTypes(prev => prev.map(pkg => 
      pkg.name === packageName 
        ? { 
            ...pkg, 
            ranges: pkg.ranges.map((range, i) => 
              i === index ? { ...range, weight } : range
            )
          }
        : pkg
    ))
  }

  const updateExtraWeight = (packageName: string, extraWeight: string) => {
    updatePackageTypes(prev => prev.map(pkg => 
      pkg.name === packageName ? { ...pkg, extraWeight } : pkg
    ))
  }

  const deletePackageType = (packageName: string) => {
    updatePackageTypes(prev => prev.filter(pkg => pkg.name !== packageName))
  }

  const addNewPackageType = () => {
    if (!newItemName.trim()) return
    
    updatePackageTypes(prev => [...prev, {
      name: newItemName,
      unit: 'GM',
      ranges: [{ weight: '100', unit: 'g' }],
      extraWeight: ''
    }])
    setNewItemName('')
  }

  const saveChanges = async () => {
    // Here you would typically save to API
    console.log('Saving package types:', packageTypes)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-400 rounded"></div>
            <h2 className="text-lg font-semibold">Default Package Types</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Add new item */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Item Name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addNewPackageType}
              className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
            >
              Add
            </button>
          </div>

          {/* Package Types */}
          <div className="space-y-6">
            {packageTypes.map((packageType) => (
              <div key={packageType.name} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center">
                      <div className="w-3 h-3 bg-gray-600 rounded"></div>
                    </div>
                    <span className="font-medium text-lg">{packageType.name}</span>
                    <select 
                      value={packageType.unit}
                      onChange={(e) => {
                        updatePackageTypes(prev => prev.map(pkg => 
                          pkg.name === packageType.name 
                            ? { ...pkg, unit: e.target.value }
                            : pkg
                        ))
                      }}
                      className="px-2 py-1 border border-slate-300 rounded text-sm"
                    >
                      <option value="GM">GM</option>
                      <option value="KG">KG</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded" title="Save">
                      <Save className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-slate-600 hover:text-gray-800 hover:bg-slate-50 rounded" title="Edit">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => deletePackageType(packageType.name)}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Weight Ranges */}
                <div className="space-y-2 mb-4">
                  {packageType.ranges.map((range, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={range.weight}
                        onChange={(e) => updateWeightRange(packageType.name, index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Weight"
                      />
                      <span className="text-sm text-slate-500 w-6">{range.unit}</span>
                      <button
                        onClick={() => removeWeightRange(packageType.name, index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addWeightRange(packageType.name)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add weight range
                  </button>
                </div>

                {/* Extra Weight */}
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Extra Weight</span>
                  </div>
                  <input
                    type="text"
                    value={packageType.extraWeight || ''}
                    onChange={(e) => updateExtraWeight(packageType.name, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Extra weight value"
                  />
                </div>
              </div>
            ))}
          </div>
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
            onClick={saveChanges}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
