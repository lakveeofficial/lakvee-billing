'use client'

import { useState, useEffect } from 'react'
import { FileText, Eye, Printer, Copy, Search } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import PartyPackageTypesModal from '@/components/PartyPackageTypesModal'
import PartyQuotationModal from '@/components/PartyQuotationModal'
import CopyQuotationModal from '@/components/CopyQuotationModal'
import GradientSectionHeader from '@/components/GradientSectionHeader'


interface Party {
  id: number
  party_name: string
  contact_person?: string
  phone?: string
  email?: string
  city?: string
  state?: string
}

interface QuotationStatus {
  hasQuotation: boolean
  packageTypes: string[]
}

export default function PartyQuotationsPage() {
  const [parties, setParties] = useState<Party[]>([])
  const [quotationStatuses, setQuotationStatuses] = useState<Record<number, QuotationStatus>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Modal states
  const [showPackageTypesModal, setShowPackageTypesModal] = useState(false)
  const [showQuotationModal, setShowQuotationModal] = useState(false)
  const [showCopyQuotationModal, setShowCopyQuotationModal] = useState(false)
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)

  useEffect(() => {
    fetchParties()
  }, [])

  const fetchParties = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/parties/quotations')
      const data = await response.json()

      if (data.success) {
        setParties(data.data || [])

        // Set quotation statuses from actual data
        const statuses: Record<number, QuotationStatus> = {}
        data.data?.forEach((party: any) => {
          statuses[party.id] = {
            hasQuotation: party.has_quotation || false,
            packageTypes: party.quotations?.map((q: any) => q.package_type) || []
          }
        })
        setQuotationStatuses(statuses)
      } else {
        console.error('Failed to fetch parties:', data.error)
      }
    } catch (error) {
      console.error('Error fetching parties:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePackageTypesClick = (party: Party) => {
    setSelectedParty(party)
    setShowPackageTypesModal(true)
  }

  const handleQuotationClick = (party: Party) => {
    setSelectedParty(party)
    setShowQuotationModal(true)
  }

  const handlePrintQuotation = (partyId: number) => {
    // Open print page in new tab
    const printUrl = `/print/party-quotation?partyId=${partyId}`
    window.open(printUrl, '_blank')
  }

  const handleCopyQuotationClick = () => {
    setShowCopyQuotationModal(true)
  }

  const filteredParties = parties.filter(party =>
    party.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.phone?.includes(searchTerm) ||
    party.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredParties.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedParties = filteredParties.slice(startIndex, startIndex + itemsPerPage)

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="Party Quotations" />
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Party Quotations" />

      {/* Quotations Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <GradientSectionHeader
          title="PARTIES & QUOTATIONS"
          actions={
            <button
              onClick={handleCopyQuotationClick}
              className="px-4 py-2 bg-white/20 text-white rounded-xl hover:bg-white/30 backdrop-blur-sm transition-colors flex items-center gap-2 border border-white/20"
            >
              <Copy className="h-4 w-4" />
              Copy Quotation
            </button>
          }
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-200 h-4 w-4" />
            <input
              type="text"
              placeholder="Search parties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-blue-400/30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
            />
          </div>
        </GradientSectionHeader>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Party Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Package Types
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Quotation
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Print
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedParties.map((party, index) => {
                  const quotationStatus = quotationStatuses[party.id] || { hasQuotation: false, packageTypes: [] }
                  const partyCode = String(party.id).padStart(4, '0')

                  return (
                    <tr key={party.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {partyCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{party.party_name}</div>
                        {party.contact_person && (
                          <div className="text-sm text-slate-500">{party.contact_person}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handlePackageTypesClick(party)}
                          className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                          title="Configure Package Types"
                        >
                          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-xs text-slate-600">⚙</span>
                          </div>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {quotationStatus.hasQuotation ? (
                          <button
                            onClick={() => handleQuotationClick(party)}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                          >
                            $
                          </button>
                        ) : (
                          <button
                            onClick={() => handleQuotationClick(party)}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-gray-200 transition-colors"
                          >
                            $
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handlePrintQuotation(party.id)}
                          className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                          title="Print Quotation"
                        >
                          <Printer className="h-4 w-4 text-slate-600" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>


          {/* Pagination */}
          <div className="bg-white px-4 py-3 border-t border-slate-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredParties.length)}</span> of{' '}
                    <span className="font-medium">{filteredParties.length}</span> entries
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                      if (pageNum > totalPages) return null

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === pageNum
                            ? 'z-10 bg-orange-50 border-orange-500 text-orange-600'
                            : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Last
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Modals */}
      {selectedParty && (
        <>
          <PartyPackageTypesModal
            isOpen={showPackageTypesModal}
            onClose={() => setShowPackageTypesModal(false)}
            partyId={selectedParty.id}
            partyName={selectedParty.party_name}
          />
          <PartyQuotationModal
            isOpen={showQuotationModal}
            onClose={() => setShowQuotationModal(false)}
            partyId={selectedParty.id}
            partyName={selectedParty.party_name}
          />
        </>
      )}

      <CopyQuotationModal
        isOpen={showCopyQuotationModal}
        onClose={() => setShowCopyQuotationModal(false)}
        onCopied={() => {
          // Refresh parties and their quotation statuses after copy
          fetchParties()
        }}
      />
    </div>
  )
}
