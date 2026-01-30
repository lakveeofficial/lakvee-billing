'use client'

import { useState, useEffect } from 'react'
import { X, MapPin } from 'lucide-react'
import { State, City } from '@/lib/indiaData'

interface CitySelectionModalProps {
  isOpen: boolean
  onClose: () => void
  state: State | null
  selectedCities: string[]
  onSave: (cities: string[]) => void
}

export default function CitySelectionModal({
  isOpen,
  onClose,
  state,
  selectedCities,
  onSave
}: CitySelectionModalProps) {
  const [localSelectedCities, setLocalSelectedCities] = useState<string[]>(selectedCities)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectAll, setSelectAll] = useState(false)

  useEffect(() => {
    setLocalSelectedCities(selectedCities)
  }, [selectedCities])

  useEffect(() => {
    if (state) {
      setSelectAll(localSelectedCities.length === state.cities.length)
    }
  }, [localSelectedCities, state])

  if (!isOpen || !state) return null

  const filteredCities = state.cities.filter(city =>
    city.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCityToggle = (cityCode: string) => {
    setLocalSelectedCities(prev =>
      prev.includes(cityCode)
        ? prev.filter(code => code !== cityCode)
        : [...prev, cityCode]
    )
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setLocalSelectedCities([])
    } else {
      setLocalSelectedCities(state.cities.map(city => city.code))
    }
    setSelectAll(!selectAll)
  }

  const handleSave = () => {
    onSave(localSelectedCities)
    onClose()
  }

  const handleCancel = () => {
    setLocalSelectedCities(selectedCities)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">{state.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Select all</span>
            </label>
            <span className="text-sm text-slate-500">
              {localSelectedCities.length} of {state.cities.length} selected
            </span>
          </div>
          
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Cities List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-2">
            {filteredCities.map((city) => (
              <label
                key={city.code}
                className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={localSelectedCities.includes(city.code)}
                  onChange={() => handleCityToggle(city.code)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                />
                <span className="text-sm text-slate-700 truncate">{city.name}</span>
              </label>
            ))}
          </div>
          
          {filteredCities.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No cities found matching your search.
            </div>
          )}
          
          {/* Show total count */}
          <div className="mt-4 pt-4 border-t border-slate-200 text-center text-sm text-slate-500">
            Showing {filteredCities.length} of {state?.cities.length || 0} cities
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
