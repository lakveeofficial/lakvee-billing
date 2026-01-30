'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Eye, Users } from 'lucide-react'
import AddClientModal from '../../../components/AddClientModal'
import GradientSectionHeader from '@/components/GradientSectionHeader'
import PageHeader from '@/components/PageHeader'


interface Party {
  id: string
  name: string
  contact_person_name: string
  city: string
  phone: string
  email: string
  gst_type: string
  status: string
}

// Mock data removed - using real API data

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingParty, setEditingParty] = useState<Party | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const itemsPerPage = 10

  useEffect(() => {
    loadParties()
  }, [])

  const loadParties = async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/clients', {
        cache: 'no-store',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        setParties(data.data || []);
      } else if (res.status === 401) {
        console.warn('Unauthorized fetching parties. Please login again.')
        setParties([])
      } else {
        setParties([]);
      }
    } catch (e) {
      setParties([]);
    }
    setLoading(false);
  }

  const filteredParties = parties.filter((party: Party) =>
    party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.contact_person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.phone.includes(searchTerm) ||
    party.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.city.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredParties.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentParties = filteredParties.slice(startIndex, endIndex)

  const handleAdd = () => {
    setIsEditMode(false)
    setEditingParty(null)
    setIsModalOpen(true)
  }

  const handleSaveParty = async (data: any) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const url = isEditMode && editingParty ? `/api/clients/${editingParty.id}` : '/api/clients'
      const method = isEditMode ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data)
      })

      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          alert(isEditMode ? 'Party updated successfully!' : 'Party created successfully!')
          loadParties() // Reload the list
        } else {
          alert(`Failed to ${isEditMode ? 'update party' : 'create party'}: ${result.error}`)
        }
      } else {
        const error = await res.json()
        alert(`Failed to ${isEditMode ? 'update party' : 'create party'}: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert(`Failed to ${isEditMode ? 'update party' : 'create party'}. Please try again.`)
    }
    setIsEditMode(false)
    setEditingParty(null)
  }

  const handleEdit = async (id: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`/api/clients/${id}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          setEditingParty(result.data)
          setIsEditMode(true)
          setIsModalOpen(true)
        } else {
          alert(`Failed to fetch party details: ${result.error}`)
        }
      } else {
        const error = await res.json()
        alert(`Failed to fetch party details: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Edit error:', error)
      alert('Failed to fetch party details. Please try again.')
    }
  }

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id)
  }

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const res = await fetch(`/api/clients/${deleteConfirmId}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (res.ok) {
          alert('Party deleted successfully!');
          loadParties(); // Reload the list
        } else {
          const error = await res.json();
          alert(`Failed to delete party: ${error.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete party. Please try again.');
      }
      setDeleteConfirmId(null);
    }
  }

  const cancelDelete = () => {
    setDeleteConfirmId(null)
  }

  const handleView = (id: string) => {
    const party = parties.find((p: Party) => p.id === id)
    if (party) {
      alert(`Party Details:\n\nName: ${party.name}\nContact Person: ${party.contact_person_name}\nCity: ${party.city}\nPhone: ${party.phone}\nEmail: ${party.email}\nGST Type: ${party.gst_type}\nStatus: ${party.status}`)
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">
      <PageHeader
        title="Party Management"
        subtitle="Manage your customers and parties"
      />
      <div className="bg-white rounded-xl shadow-sm">
        {/* Header & Search */}
        <GradientSectionHeader
          title="Parties"
          actions={
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 backdrop-blur-sm transition-colors border border-white/20 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Party
            </button>
          }
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-100" />
            <input
              type="text"
              placeholder="Search parties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-blue-200/30 rounded-lg text-white placeholder-blue-100 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
            />
          </div>
        </GradientSectionHeader>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <input type="checkbox" className="rounded border-slate-300" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  City
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Contact Person Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Phone 1
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentParties.map((party: Party) => (
                <tr key={party.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {party.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {party.city}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {party.contact_person_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {party.phone}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {party.email}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleView(party.id)}
                        className="text-slate-400 hover:text-blue-600"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(party.id)}
                        className="text-slate-400 hover:text-slate-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(party.id)}
                        className="text-slate-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
          <div className="text-sm text-slate-700">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredParties.length)} of {filteredParties.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm bg-orange-500 text-white rounded-md">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Add Party Modal */}
      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setIsEditMode(false)
          setEditingParty(null)
        }}
        onSave={handleSaveParty}
        initialData={editingParty}
        isEditMode={isEditMode}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Confirm Delete
              </h3>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete this party? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
