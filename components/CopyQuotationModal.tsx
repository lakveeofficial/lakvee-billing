'use client'

import { useState, useEffect } from 'react'
import { X, Copy, Search } from 'lucide-react'

interface Party {
  id: number
  party_name: string
  contact_person?: string
}

interface CopyQuotationModalProps {
  isOpen: boolean
  onClose: () => void
  onCopied?: () => void
}

export default function CopyQuotationModal({ isOpen, onClose, onCopied }: CopyQuotationModalProps) {
  const [sourceParty, setSourceParty] = useState('')
  const [targetParties, setTargetParties] = useState<number[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [filteredParties, setFilteredParties] = useState<Party[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [copying, setCopying] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchParties()
    }
  }, [isOpen])

  useEffect(() => {
    if (searchTerm) {
      setFilteredParties(
        parties.filter(party =>
          party.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          party.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    } else {
      setFilteredParties(parties)
    }
  }, [searchTerm, parties])

  const fetchParties = async () => {
    try {
      setLoading(true)
      // Use the quotations parties endpoint (returns parties with basic info)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: HeadersInit = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const response = await fetch('/api/parties/quotations', { headers })
      const data = await response.json()

      if (data.success) {
        // Map to the minimal Party shape the modal needs
        const list: Party[] = (data.data || []).map((p: any) => ({
          id: p.id,
          party_name: p.party_name || p.name || '',
          contact_person: p.contact_person || p.contact_person_name || ''
        }))
        setParties(list)
        setFilteredParties(list)
      } else {
        console.error('Failed to fetch parties:', data.error)
        setParties([])
        setFilteredParties([])
      }
    } catch (error) {
      console.error('Error fetching parties:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTargetParty = (partyId: number) => {
    setTargetParties(prev => 
      prev.includes(partyId)
        ? prev.filter(id => id !== partyId)
        : [...prev, partyId]
    )
  }

  const handleCopyQuotation = async () => {
    if (!sourceParty || targetParties.length === 0) {
      alert('Please select source party and at least one target party')
      return
    }

    try {
      setCopying(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const response = await fetch('/api/parties/quotations/copy', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sourcePartyId: parseInt(sourceParty),
          targetPartyIds: targetParties
        })
      })

      const data = await response.json()
      if (data.success) {
        const okCount = Array.isArray(data.results) ? data.results.filter((r: any) => r.status === 'ok').length : targetParties.length
        alert(`Quotation copied to ${okCount} parties successfully!`)
        onClose()
        setSourceParty('')
        setTargetParties([])
        setSearchTerm('')
        // Trigger parent refresh if provided
        if (onCopied) onCopied()
      } else {
        alert('Failed to copy quotation: ' + data.error)
      }
    } catch (error) {
      console.error('Error copying quotation:', error)
      alert('Failed to copy quotation')
    } finally {
      setCopying(false)
    }
  }

  if (!isOpen) return null

  const sourcePartyName = parties.find(p => p.id === parseInt(sourceParty))?.party_name || ''

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Copy className="h-5 w-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Copy Quotation</h2>
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
              {/* Copy quotation from */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Copy quotation from
                </label>
                <select
                  value={sourceParty}
                  onChange={(e) => setSourceParty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select</option>
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.party_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Copy quotation to */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Copy quotation to
                </label>
                
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Party List */}
                <div className="border border-slate-300 rounded-xl max-h-64 overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {filteredParties
                      .filter(party => party.id !== parseInt(sourceParty))
                      .map((party) => (
                        <label
                          key={party.id}
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={targetParties.includes(party.id)}
                            onChange={() => toggleTargetParty(party.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{party.party_name}</div>
                            {party.contact_person && (
                              <div className="text-sm text-slate-500">{party.contact_person}</div>
                            )}
                          </div>
                        </label>
                      ))}
                  </div>
                </div>

                {targetParties.length > 0 && (
                  <div className="mt-2 text-sm text-slate-600">
                    {targetParties.length} parties selected
                  </div>
                )}
              </div>
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
            onClick={handleCopyQuotation}
            disabled={copying || !sourceParty || targetParties.length === 0}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            {copying ? 'Copying...' : 'Copy Quotation'}
          </button>
        </div>
      </div>
    </div>
  )
}
