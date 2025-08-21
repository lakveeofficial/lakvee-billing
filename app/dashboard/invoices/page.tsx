'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Download,
  Eye,
  Calendar,
  DollarSign,
  FileText,
  FileDown,
  Printer,
  Upload
} from 'lucide-react'
import TemplateSelectionModal from '@/components/TemplateSelectionModal'
import { Invoice, InvoiceFilters, INVOICE_STATUSES, PAYMENT_STATUSES, PAYMENT_TYPES } from '@/types/invoice'
import PageHeader from '@/components/PageHeader'
import ConfirmDialog from '@/components/ConfirmDialog'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [filters, setFilters] = useState<InvoiceFilters>({
    search: '',
    status: 'all',
    paymentStatus: 'all',
    dateFrom: '',
    dateTo: '',
    customerId: 'all',
    recordType: 'invoice'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>({})
  const [parties, setParties] = useState<any[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, id?: string, label?: string }>({ open: false })
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [invoices, filters])

  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch invoices list from API
      const invRes = await fetch('/api/invoices', { credentials: 'include' })
      if (!invRes.ok) throw new Error('Failed to load invoices')
      const invJson = await invRes.json()
      const apiInvoices: any[] = invJson.data || []

      // Map API rows to UI Invoice shape (minimal fields for listing)
      const mappedInvoices: Invoice[] = apiInvoices.map((row: any) => {
        const displayTotal = Number((row as any).display_total_amount ?? row.total_amount ?? 0)
        const received = Number(row.received_amount || 0)
        const balance = displayTotal - received
        return ({
        id: String(row.id),
        invoiceNumber: row.invoice_number,
        invoiceDate: row.invoice_date,
        dueDate: (row as any).due_date || undefined,
        customer: {
          id: String(row.party_id),
          partyName: row.party_name || 'Unknown',
          phoneNumber: row.phone || '',
          email: row.email || '',
          billingAddress: { street: row.address || '', city: row.city || '', state: row.state || '', pincode: row.pincode || '', country: 'India' },
          useShippingAddress: false,
          gstType: 'registered',
          state: row.state || '',
          createdAt: row.created_at || '',
          updatedAt: row.updated_at || ''
        } as any,
        billingName: '',
        billingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
        shippingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
        stateOfSupply: row.state || '',
        items: [],
        additionalCharges: { shipping: 0, packaging: 0, fuelCharges: 0, tcs: 0, otherCharges: 0 },
        paymentInfo: {
          paymentType: 'cash',
          totalAmount: displayTotal,
          receivedAmount: received,
          balance: balance,
          status: (row.payment_status || 'unpaid') as any,
        },
        roundOff: Number(row.round_off || 0),
        totalAmount: displayTotal,
        receivedAmount: received,
        balance: balance,
        status: (row.status || 'draft') as any,
        attachments: [],
        notes: row.notes || '',
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
        // Prefer API provided record type; default to undefined (treated as 'invoice' in filters/UI)
        recordType: (row as any).record_type || (row as any).recordType
      })
      })

      // Fetch parties for filter dropdown
      const partyRes = await fetch('/api/parties', { credentials: 'include' })
      if (!partyRes.ok) throw new Error('Failed to load parties')
      const partyJson = await partyRes.json()
      const loadedParties = partyJson.data || []

      // Simple summary (can be enhanced later from API)
      const summaryData = {
        totalInvoices: mappedInvoices.length,
        totalAmount: mappedInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0),
        totalReceived: mappedInvoices.reduce((s, i) => s + (i.receivedAmount || 0), 0),
      }

      setInvoices(mappedInvoices)
      setParties(loadedParties)
      setSummary(summaryData)
    } catch (e) {
      console.error('Failed to load invoices list', e)
      setInvoices([])
      setParties([])
      setSummary({})
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = invoices

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm) ||
        invoice.customer.partyName.toLowerCase().includes(searchTerm) ||
        invoice.customer.phoneNumber.includes(searchTerm) ||
        invoice.stateOfSupply.toLowerCase().includes(searchTerm)
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === filters.status)
    }

    // Payment status filter
    if (filters.paymentStatus !== 'all') {
      filtered = filtered.filter(invoice => invoice.paymentInfo.status === filters.paymentStatus)
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(invoice => invoice.invoiceDate >= filters.dateFrom)
    }
    if (filters.dateTo) {
      filtered = filtered.filter(invoice => invoice.invoiceDate <= filters.dateTo)
    }

    // Customer filter
    if (filters.customerId !== 'all') {
      filtered = filtered.filter(invoice => invoice.customer.id === filters.customerId)
    }

    // Record type filter
    if (filters.recordType !== 'all') {
      filtered = filtered.filter(invoice => (invoice.recordType || 'invoice') === filters.recordType)
    }

    setFilteredInvoices(filtered)
  }

  // Derived counts for tabs
  const generatedCount = useMemo(
    () => invoices.filter(inv => (inv.recordType || 'invoice') === 'invoice').length,
    [invoices]
  )
  const manualCount = useMemo(
    () => invoices.filter(inv => (inv.recordType || 'invoice') === 'sale').length,
    [invoices]
  )

  // Derived summary for current filtered list
  const currentSummary = useMemo(() => {
    const totalInvoices = filteredInvoices.length
    const totalAmount = filteredInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0)
    const totalReceived = filteredInvoices.reduce((s, i) => s + (i.receivedAmount || 0), 0)
    const totalBalance = filteredInvoices.reduce((s, i) => s + (i.balance || 0), 0)
    return { totalInvoices, totalAmount, totalReceived, totalBalance }
  }, [filteredInvoices])

  const handlePreview = (invoice: Invoice) => {
    router.push(`/dashboard/invoices/${invoice.id}`)
  }

  const confirmDelete = (id: string, label?: string) => {
    setDeleteDialog({ open: true, id, label })
  }

  const performDelete = async () => {
    const id = deleteDialog.id
    if (!id) return
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to delete invoice' }))
        alert(data.error || 'Failed to delete invoice')
        return
      }
      await loadData()
    } catch (e) {
      console.error('Failed to delete invoice', e)
      alert('Failed to delete invoice')
    } finally {
      setDeleteDialog({ open: false })
    }
  }

  const handleExport = () => {
    const csvContent = [
      ['Invoice Number', 'Date', 'Party / Sender', 'Amount', 'Received', 'Balance', 'Status', 'Payment Status'],
      ...filteredInvoices.map(invoice => [
        invoice.invoiceNumber,
        invoice.invoiceDate,
        invoice.customer.partyName,
        invoice.totalAmount.toString(),
        invoice.receivedAmount.toString(),
        invoice.balance.toString(),
        invoice.status,
        invoice.paymentInfo.status
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoices_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleDownloadPDF = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowTemplateModal(true)
  }

  const generatePDFWithTemplate = async (templateId: string) => {
    if (!selectedInvoice) return
    try {
      const tpl = templateId || 'courier_aryan'
      const url = `/api/invoices/${selectedInvoice.id}/pdf?template=${encodeURIComponent(tpl)}`
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setShowTemplateModal(false)
      setSelectedInvoice(null)
    }
  }

  const handleDownloadCSV = (invoice: Invoice) => {
    const csvContent = [
      ['Field', 'Value'],
      ['Invoice Number', invoice.invoiceNumber],
      ['Invoice Date', invoice.invoiceDate],
      ['Party / Sender Name', invoice.customer.partyName],
      ['Party / Sender Phone', invoice.customer.phoneNumber],
      ['Party / Sender Email', invoice.customer.email || 'N/A'],
      ['GSTIN', invoice.customer.gstin || 'N/A'],
      ['Total Amount', invoice.totalAmount.toString()],
      ['Received Amount', invoice.receivedAmount.toString()],
      ['Balance', invoice.balance.toString()],
      ['Status', invoice.status],
      ['Payment Status', invoice.paymentInfo.status],
      ['', ''],
      ['Items', ''],
      ['Item Number', 'Booking Date', 'Destination', 'Quantity', 'Rate', 'Discount', 'Tax', 'Total'],
      ...invoice.items.map((item, idx) => [
        String(idx + 1),
        item.bookingDate,
        item.destination,
        item.quantity.toString(),
        item.pricePerUnit.toString(),
        item.discount.amount.toString(),
        item.tax.amount.toString(),
        item.totalAmount.toString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice_${invoice.invoiceNumber}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const getStatusColor = (status: string, type: 'invoice' | 'payment') => {
    const statuses = type === 'invoice' ? INVOICE_STATUSES : PAYMENT_STATUSES
    const statusObj = statuses.find(s => s.value === status)
    return statusObj?.color || 'gray'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
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
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title="Sales Invoices"
        subtitle="Manage and track all your sales invoices"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard/invoices/upload')}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
            >
              <Download className="h-4 w-4 mr-2 text-emerald-200" />
              Upload CSV
            </button>
            <button
              onClick={() => router.push('/dashboard/invoices/new')}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-white/20 hover:bg-white/30 border border-white/20 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2 text-sky-200" />
              New Invoice
            </button>
          </div>
        }
      />

      {/* Tabs: Generated Party Invoices | Manualy Generated Invoice */}
      <div className="mb-4">
        <div className="inline-flex rounded-md shadow-sm border border-gray-200 bg-white overflow-hidden">
          <button
            className={`px-4 py-2 text-sm font-medium ${filters.recordType === 'invoice' ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setFilters(prev => ({ ...prev, recordType: 'invoice' }))}
          >
            Generated Party Invoices
            <span className={`ml-2 inline-flex items-center justify-center rounded-full text-xs px-2 py-0.5 ${filters.recordType === 'invoice' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>{generatedCount}</span>
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-l border-gray-200 ${filters.recordType === 'sale' ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setFilters(prev => ({ ...prev, recordType: 'sale' }))}
          >
            Manualy Generated Invoice
            <span className={`ml-2 inline-flex items-center justify-center rounded-full text-xs px-2 py-0.5 ${filters.recordType === 'sale' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>{manualCount}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-500 rounded-md p-3">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-semibold text-gray-900">{currentSummary.totalInvoices}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-green-500 rounded-md p-3">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(currentSummary.totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-purple-500 rounded-md p-3">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Received</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(currentSummary.totalReceived)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-red-500 rounded-md p-3">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Balance</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(currentSummary.totalBalance)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoices by number, party/sender, phone..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>

            {/* Export */}
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Statuses</option>
                  {INVOICE_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Payment Status</option>
                  {PAYMENT_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Record Type
                </label>
                <select
                  value={filters.recordType}
                  onChange={(e) => setFilters(prev => ({ ...prev, recordType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Records</option>
                  <option value="invoice">Invoices</option>
                  <option value="sale">Sales (Imported)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Party / Sender
                </label>
                <select
                  value={filters.customerId}
                  onChange={(e) => setFilters(prev => ({ ...prev, customerId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Parties/Senders</option>
                  {parties.map(party => (
                    <option key={party.id} value={party.id}>
                      {party.partyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600">
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <FileText className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.status !== 'all' || filters.paymentStatus !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'Get started by creating your first invoice.'}
            </p>
            <button
              onClick={() => router.push('/dashboard/invoices/new')}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Party / Sender
                  </th>
                  
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {invoice.invoiceNumber}
                          {(invoice.recordType || 'invoice') === 'sale' && (
                            <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Sale
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.customer.partyName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {invoice.customer.phoneNumber}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.totalAmount)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handlePreview(invoice)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Preview Invoice"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(invoice)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Download PDF"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadCSV(invoice)}
                          className="text-purple-600 hover:text-purple-900 p-1"
                          title="Download CSV"
                        >
                          <FileDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(invoice.id, invoice.invoiceNumber)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Template Selection Modal */}
      <TemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false)
          setSelectedInvoice(null)
        }}
        onSelect={generatePDFWithTemplate}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${deleteDialog.label || deleteDialog.id}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        onConfirm={performDelete}
        onCancel={() => setDeleteDialog({ open: false })}
      />
    </div>
  )
}
