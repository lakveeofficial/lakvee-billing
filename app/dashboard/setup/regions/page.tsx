'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import { INDIAN_STATES, METRO_CITIES, State, City } from '@/lib/indiaData'
import CitySelectionModal from '@/components/CitySelectionModal'
import AddRegionModal from '@/components/AddRegionModal'
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal'

interface Region {
  id: number
  name: string
  states: { [stateCode: string]: string[] } // stateCode -> array of city codes
  created_at: string
}

export default function RegionsPage() {
  const [regions, setRegions] = useState<Region[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const [cityModalOpen, setCityModalOpen] = useState(false)
  const [selectedState, setSelectedState] = useState<State | null>(null)
  const [addRegionModalOpen, setAddRegionModalOpen] = useState(false)
  const [editingRegion, setEditingRegion] = useState<Region | null>(null)
  const [editRegionModalOpen, setEditRegionModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [regionToDelete, setRegionToDelete] = useState<Region | null>(null)

  useEffect(() => {
    loadRegions()
  }, [])

  const loadRegions = async () => {
    try {
      setLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/regions', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          // Transform database regions to match UI interface
          const transformedRegions = result.data.map((region: any) => ({
            id: region.id,
            name: region.name,
            states: region.states || {}, // Use the states data from the database
            created_at: region.created_at
          }))
          setRegions(transformedRegions)
        } else {
          console.error('Failed to load regions:', result.error)
          alert('Failed to load regions: ' + result.error)
        }
      } else {
        const error = await res.json()
        console.error('Failed to load regions:', error)
        alert('Failed to load regions: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error loading regions:', error)
      alert('Failed to load regions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStateName = (stateCode: string) => {
    const state = INDIAN_STATES.find(s => s.code === stateCode)
    return state ? state.name : stateCode
  }

  const getCityName = (cityCode: string) => {
    for (const state of INDIAN_STATES) {
      const city = state.cities.find(c => c.code === cityCode)
      if (city) return city.name
    }
    const metroCity = METRO_CITIES.find(c => c.code === cityCode)
    return metroCity ? metroCity.name : cityCode
  }

  const handleStateClick = (stateCode: string, region: Region) => {
    const state = INDIAN_STATES.find(s => s.code === stateCode)
    if (state) {
      setSelectedState(state)
      setSelectedRegion(region)
      setCityModalOpen(true)
    }
  }

  const handleCitySave = async (cities: string[]) => {
    if (selectedRegion && selectedState) {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const res = await fetch(`/api/regions/${selectedRegion.id}/states`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            stateCode: selectedState.code,
            cities: cities
          })
        })

        const result = await res.json()
        if (result.success) {
          alert(`Successfully saved ${cities.length} cities for ${selectedState.name}!`)
          loadRegions() // Reload to get updated data from database
        } else {
          alert('Failed to save cities: ' + result.error)
        }
      } catch (error) {
        console.error('Error saving cities:', error)
        alert('Failed to save cities. Please try again.')
      }
    }
  }

  const handleAddRegion = async (regionData: { name: string; country: string }) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/regions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code: regionData.name.toUpperCase().replace(/\s+/g, '_'),
          name: regionData.name
        })
      })

      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          alert('Region created successfully!')
          loadRegions() // Reload the list
        } else {
          alert('Failed to create region: ' + result.error)
        }
      } else {
        const error = await res.json()
        alert('Failed to create region: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating region:', error)
      alert('Failed to create region. Please try again.')
    }
  }

  const handleEditRegion = (region: Region) => {
    setEditingRegion(region)
    setEditRegionModalOpen(true)
  }

  const handleUpdateRegion = async (regionData: { name: string; country: string }) => {
    if (editingRegion) {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const res = await fetch(`/api/regions/${editingRegion.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            code: regionData.name.toUpperCase().replace(/\s+/g, '_'),
            name: regionData.name
          })
        })

        if (res.ok) {
          const result = await res.json()
          if (result.success) {
            alert('Region updated successfully!')
            loadRegions() // Reload the list
            setEditingRegion(null)
          } else {
            alert('Failed to update region: ' + result.error)
          }
        } else {
          const error = await res.json()
          alert('Failed to update region: ' + (error.error || 'Unknown error'))
        }
      } catch (error) {
        console.error('Error updating region:', error)
        alert('Failed to update region. Please try again.')
      }
    }
  }

  const handleDeleteRegion = (region: Region) => {
    setRegionToDelete(region)
    setDeleteModalOpen(true)
  }

  const confirmDeleteRegion = async () => {
    if (regionToDelete) {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const res = await fetch(`/api/regions/${regionToDelete.id}`, {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })

        if (res.ok) {
          const result = await res.json()
          if (result.success) {
            alert('Region deleted successfully!')
            loadRegions() // Reload the list
            setRegionToDelete(null)
          } else {
            alert('Failed to delete region: ' + result.error)
          }
        } else {
          const error = await res.json()
          alert('Failed to delete region: ' + (error.error || 'Unknown error'))
        }
      } catch (error) {
        console.error('Error deleting region:', error)
        alert('Failed to delete region. Please try again.')
      }
    }
  }

  const renderStateBadges = (region: Region) => {
    const badges = []

    // Add state badges
    for (const [stateCode, cities] of Object.entries(region.states)) {
      const stateName = getStateName(stateCode)
      const isSelected = cities.length > 0

      badges.push(
        <button
          key={stateCode}
          onClick={() => handleStateClick(stateCode, region)}
          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border transition-colors hover:shadow-sm ${isSelected
            ? 'bg-green-500 text-white border-green-500'
            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-gray-200'
            }`}
          title={`${stateName} (${cities.length} cities selected)`}
        >
          {stateCode} ({cities.length})
        </button>
      )
    }

    // Add remaining states as unselected badges
    const usedStates = Object.keys(region.states)
    const remainingStates = INDIAN_STATES.filter(state => !usedStates.includes(state.code))

    for (const state of remainingStates) {
      badges.push(
        <button
          key={state.code}
          onClick={() => handleStateClick(state.code, region)}
          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border bg-slate-100 text-slate-700 border-slate-300 hover:bg-gray-200 transition-colors hover:shadow-sm"
          title={`${state.name} (0 cities selected)`}
        >
          {state.code} (0)
        </button>
      )
    }

    return badges
  }

  const filteredRegions = regions.filter(region =>
    region.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-4 bg-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-sm text-blue-600">
          <span>🏠 Home</span>
          <span>/</span>
          <span>Setup</span>
          <span>/</span>
          <span className="text-slate-600">Regions</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-slate-700">🎯 Regions</span>
          </div>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <button
              onClick={() => setAddRegionModalOpen(true)}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
              title="Add Region"
            >
              <Plus className="h-4 w-4 text-slate-400 hover:text-slate-600" />
            </button>
          </div>
        </div>

        {/* Regions Table */}
        <div className="bg-white border border-slate-300 rounded">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-300">
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" className="rounded border-slate-300" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 border-r border-slate-300">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
                  State and Center
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 w-20">
                  Actions
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 w-20">
                  Delete
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRegions.map((region) => (
                <tr key={region.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 border-r border-slate-200 align-top">
                    {region.name}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {renderStateBadges(region)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleEditRegion(region)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDeleteRegion(region)}
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4 text-sm text-slate-600">
          <div>
            Showing 1 to 7 of 7 entries
          </div>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-slate-300 rounded text-slate-500 cursor-not-allowed">
              First
            </button>
            <button className="px-3 py-1 border border-slate-300 rounded text-slate-500 cursor-not-allowed">
              Previous
            </button>
            <button className="px-3 py-1 bg-orange-500 text-white rounded">
              1
            </button>
            <button className="px-3 py-1 border border-slate-300 rounded text-slate-500 cursor-not-allowed">
              Next
            </button>
            <button className="px-3 py-1 border border-slate-300 rounded text-slate-500 cursor-not-allowed">
              Last
            </button>
          </div>
        </div>
      </div>

      {/* City Selection Modal */}
      <CitySelectionModal
        isOpen={cityModalOpen}
        onClose={() => setCityModalOpen(false)}
        state={selectedState}
        selectedCities={selectedRegion && selectedState ? (selectedRegion.states[selectedState.code] || []) : []}
        onSave={handleCitySave}
      />

      {/* Add Region Modal */}
      <AddRegionModal
        isOpen={addRegionModalOpen}
        onClose={() => setAddRegionModalOpen(false)}
        onSave={handleAddRegion}
      />

      {/* Edit Region Modal */}
      <AddRegionModal
        isOpen={editRegionModalOpen}
        onClose={() => {
          setEditRegionModalOpen(false)
          setEditingRegion(null)
        }}
        onSave={handleUpdateRegion}
        initialData={editingRegion ? { name: editingRegion.name, country: 'INDIA' } : undefined}
        title="Edit Region"
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setRegionToDelete(null)
        }}
        onConfirm={confirmDeleteRegion}
        title="Delete Region"
        itemName={regionToDelete?.name}
        itemType="region"
        message={regionToDelete ? `Are you sure you want to delete the region "${regionToDelete.name}"? This will remove all associated state and city mappings. This action cannot be undone.` : undefined}
      />
    </div>
  )
}
