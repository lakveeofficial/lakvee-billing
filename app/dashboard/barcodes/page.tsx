'use client'

import { useState } from 'react'
import { Search, Plus, Edit, Trash2, MoreHorizontal, Eye } from 'lucide-react'
import AddBarcodeModal from '../../../components/AddBarcodeModal'

interface Barcode {
  id: string
  carrier: string
  barcode: string
  available: string
}

const mockBarcodes: Barcode[] = [
  {
    id: '1',
    carrier: 'PROFESSIONAL COURIER',
    barcode: 'VP6803033, VP6503086',
    available: '2'
  }
]

export default function BarcodesPage() {
  const [barcodes, setBarcodes] = useState<Barcode[]>(mockBarcodes)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingBarcode, setEditingBarcode] = useState<Barcode | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const itemsPerPage = 10

  const filteredBarcodes = barcodes.filter(barcode =>
    barcode.carrier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    barcode.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredBarcodes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentBarcodes = filteredBarcodes.slice(startIndex, endIndex)

  const handleAdd = () => {
    setIsEditMode(false)
    setEditingBarcode(null)
    setIsModalOpen(true)
  }

  const handleSaveBarcode = (data: { carrier: string; start: string; end: string }) => {
    if (isEditMode && editingBarcode) {
      // Update existing barcode
      const updatedBarcodes = barcodes.map(barcode =>
        barcode.id === editingBarcode.id
          ? {
              ...barcode,
              carrier: data.carrier,
              barcode: `${data.start} - ${data.end}`
            }
          : barcode
      )
      setBarcodes(updatedBarcodes)
    } else {
      // Add new barcode
      const newBarcode: Barcode = {
        id: Date.now().toString(),
        carrier: data.carrier,
        barcode: `${data.start} - ${data.end}`,
        available: '2'
      }
      setBarcodes([...barcodes, newBarcode])
    }
    setIsEditMode(false)
    setEditingBarcode(null)
  }

  const handleEdit = (id: string) => {
    const barcode = barcodes.find(b => b.id === id)
    if (barcode) {
      setEditingBarcode(barcode)
      setIsEditMode(true)
      setIsModalOpen(true)
    }
  }

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id)
  }

  const confirmDelete = () => {
    if (deleteConfirmId) {
      setBarcodes(barcodes.filter(barcode => barcode.id !== deleteConfirmId))
      setDeleteConfirmId(null)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirmId(null)
  }

  const handleView = (id: string) => {
    const barcode = barcodes.find(b => b.id === id)
    if (barcode) {
      alert(`Barcode Details:\n\nCarrier: ${barcode.carrier}\nBarcode: ${barcode.barcode}\nAvailable: ${barcode.available}`)
    }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <h1 className="text-lg font-medium text-slate-900">Barcodes</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <input type="checkbox" className="rounded border-slate-300" />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-1">
                    Carrier
                    <div className="flex flex-col">
                      <div className="w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-400"></div>
                      <div className="w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-300 mt-0.5"></div>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-1">
                    Barcode
                    <div className="flex flex-col">
                      <div className="w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-400"></div>
                      <div className="w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-300 mt-0.5"></div>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-1">
                    Available
                    <div className="flex flex-col">
                      <div className="w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-400"></div>
                      <div className="w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-300 mt-0.5"></div>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col">
                      <div className="w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-400"></div>
                      <div className="w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-300 mt-0.5"></div>
                    </div>
                  </div>
                </th>
                <th className="w-32 px-4 py-3 text-center text-sm font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentBarcodes.map((barcode) => (
                <tr key={barcode.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                        P
                      </div>
                      <span className="text-sm text-slate-900">{barcode.carrier}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {barcode.barcode}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {barcode.available}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={handleAdd}
                      className="text-orange-500 hover:text-orange-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleView(barcode.id)}
                        className="text-slate-400 hover:text-blue-600"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(barcode.id)}
                        className="text-slate-400 hover:text-slate-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(barcode.id)}
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
            Showing {startIndex + 1} to {Math.min(endIndex, filteredBarcodes.length)} of {filteredBarcodes.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm bg-orange-500 text-white rounded">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Add Barcode Modal */}
      <AddBarcodeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setIsEditMode(false)
          setEditingBarcode(null)
        }}
        onSave={handleSaveBarcode}
        carrierName={editingBarcode?.carrier || "PROFESSIONAL COURIER"}
        initialData={editingBarcode ? {
          start: editingBarcode.barcode.split(' - ')[0] || '',
          end: editingBarcode.barcode.split(' - ')[1] || ''
        } : undefined}
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
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to delete this barcode? This action cannot be undone.
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
