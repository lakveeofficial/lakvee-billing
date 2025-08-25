'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BarChart3, 
  FileText, 
  Calendar, 
  Download, 
  Printer,
  Filter,
  Users,
  TrendingUp,
  DollarSign,
  Clock
} from 'lucide-react'
import { 
  ReportFilters, 
  REPORT_TYPES, 
  SalesReportData, 
  PartyStatementData, 
  DaybookData,
  ReportSummary,
  OutstandingRow,
  PartySummaryRow,
  GstSummaryRow
} from '@/types/reports'
import { ReportService } from '@/lib/reportService'
import { Party } from '@/types/party'
import PageHeader from '@/components/PageHeader'

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    reportType: 'sales',
    customerId: 'all',
    statusFilter: 'all'
  })
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [parties, setParties] = useState<Party[]>([])
  const [showFilters, setShowFilters] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadParties()
  }, [])

  useEffect(() => {
    if (filters.dateFrom && filters.dateTo) {
      generateReport()
    }
  }, [filters])

  const loadParties = async () => {
    try {
      const res = await fetch(`/api/parties?limit=100&page=1`, { credentials: 'include' })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      // Map API to Party type used by UI
      const mapped: Party[] = (json.data || []).map((p: any) => ({
        id: String(p.id),
        partyName: p.partyName ?? p.party_name ?? '',
        phoneNumber: p.phone ?? '',
        email: p.email ?? '',
        billingAddress: p.billingAddress ?? { street: p.address ?? '', city: p.city ?? '', pincode: p.pincode ?? '' },
      }))
      setParties(mapped)
    } catch (e) {
      console.error('Failed to load parties from API', e)
      setParties([])
    }
  }

  const generateReport = async () => {
    // Clear previous data to avoid render of wrong shape while switching tabs
    setReportData(null)
    setLoading(true)
    
    try {
      // Build query params for invoices API
      const params = new URLSearchParams()
      if (filters.dateFrom) params.set('date_from', filters.dateFrom)
      if (filters.dateTo) params.set('date_to', filters.dateTo)
      if (filters.customerId && filters.customerId !== 'all') params.set('party_id', String(filters.customerId))
      params.set('limit', '100')
      params.set('page', '1')
      const res = await fetch(`/api/invoices?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      const invoices = (json.data || []).map((row: any) => ({
        id: row.id,
        invoice_number: row.invoice_number,
        invoice_date: row.invoice_date,
        party_name: row.party_name,
        party_phone: row.party_phone ?? row.phone ?? '',
        total_amount: Number(row.total_amount || 0),
        received_amount: Number(row.received_amount || 0),
        payment_status: row.payment_status || 'pending',
        created_at: row.created_at,
      }))

      if (filters.reportType === 'sales') {
        const dataRows: SalesReportData[] = invoices.map((inv: any) => ({
          invoiceNumber: inv.invoice_number,
          invoiceDate: inv.invoice_date,
          customerName: inv.party_name,
          customerPhone: inv.party_phone || '',
          totalAmount: inv.total_amount,
          receivedAmount: inv.received_amount,
          balance: inv.total_amount - inv.received_amount,
          paymentType: 'N/A',
          status: computePaymentStatus({ total: inv.total_amount, received: inv.received_amount, backend: inv.payment_status }),
          paymentStatus: computePaymentStatus({ total: inv.total_amount, received: inv.received_amount, backend: inv.payment_status }),
        }))
        const matchesStatus = (st: string) => {
          const f = (filters.statusFilter || 'all')
          const s = (st || '').toLowerCase()
          if (f === 'all') return true
          if (f === 'paid') return s === 'paid'
          if (f === 'unpaid') return s === 'unpaid'
          if (f === 'partial') return s.includes('partially paid')
          if (f === 'overdue') return s.includes('overdue')
          return true
        }
        const filteredRows: SalesReportData[] = dataRows.filter((r: SalesReportData) => matchesStatus(r.status))
        const summary = {
          totalInvoices: filteredRows.length,
          totalSales: filteredRows.reduce((s: number, r: SalesReportData) => s + (r.totalAmount || 0), 0),
          totalReceived: filteredRows.reduce((s: number, r: SalesReportData) => s + (r.receivedAmount || 0), 0),
          totalBalance: filteredRows.reduce((s: number, r: SalesReportData) => s + ((r.totalAmount - r.receivedAmount) || 0), 0),
        } as ReportSummary
        setReportData({ data: filteredRows, summary })
      } else if (filters.reportType === 'party_statement') {
        // Group by party
        const byParty = new Map<string, any[]>()
        invoices.forEach((inv: any) => {
          const key = inv.party_name || 'Unknown'
          if (!byParty.has(key)) byParty.set(key, [])
          byParty.get(key)!.push(inv)
        })
        const statements = Array.from(byParty.entries()).map(([partyName, invs]) => {
          let running = 0
          const transactions = invs
            .sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime())
            .flatMap((inv) => {
              const tx: any[] = []
              running += inv.total_amount
              tx.push({
                date: inv.invoice_date,
                invoiceNumber: inv.invoice_number,
                description: `Invoice`,
                debit: inv.total_amount,
                credit: 0,
                balance: running,
                type: 'invoice',
              })
              if (inv.received_amount > 0) {
                running -= inv.received_amount
                tx.push({
                  date: inv.invoice_date,
                  invoiceNumber: inv.invoice_number,
                  description: `Payment received`,
                  debit: 0,
                  credit: inv.received_amount,
                  balance: running,
                  type: 'payment',
                })
              }
              return tx
            })
          const totalSales = invs.reduce((s, i) => s + i.total_amount, 0)
          const totalReceived = invs.reduce((s, i) => s + i.received_amount, 0)
          return {
            partyName,
            partyPhone: '',
            transactions,
            openingBalance: 0,
            closingBalance: running,
            totalSales,
            totalReceived,
          }
        })
        setReportData(statements)
      } else if (filters.reportType === 'daybook') {
        // Group by date
        const byDate = new Map<string, any[]>()
        invoices.forEach((inv: any) => {
          const date = inv.invoice_date
          if (!byDate.has(date)) byDate.set(date, [])
          byDate.get(date)!.push(inv)
        })
        const daybook = Array.from(byDate.entries()).map(([date, invs]) => {
          const entries = invs
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((inv) => ({
              time: new Date(inv.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              invoiceNumber: inv.invoice_number,
              customerName: inv.party_name,
              description: 'Invoice',
              amount: Number(inv.total_amount || 0),
              receivedAmount: Number(inv.received_amount || 0),
              balance: Number(inv.total_amount || 0) - Number(inv.received_amount || 0),
              paymentType: 'N/A',
            }))
          const totalSales = invs.reduce((s, i) => s + Number(i.total_amount || 0), 0)
          const totalReceived = invs.reduce((s, i) => s + Number(i.received_amount || 0), 0)
          return { date, entries, totalSales, totalReceived }
        })
        setReportData(daybook)
      } else if (filters.reportType === 'outstanding') {
        const rows: OutstandingRow[] = invoices
          .filter((inv: any) => (inv.total_amount - inv.received_amount) > 0)
          .map((inv: any) => ({
            invoiceNumber: inv.invoice_number,
            invoiceDate: inv.invoice_date,
            customerName: inv.party_name,
            totalAmount: inv.total_amount,
            receivedAmount: inv.received_amount,
            balance: inv.total_amount - inv.received_amount,
          }))
        setReportData(rows)
      } else if (filters.reportType === 'party_summary') {
        const byParty = new Map<string, { totalSales: number; totalReceived: number }>()
        invoices.forEach((inv: any) => {
          const key = inv.party_name || 'Unknown'
          const cur = byParty.get(key) || { totalSales: 0, totalReceived: 0 }
          cur.totalSales += inv.total_amount
          cur.totalReceived += inv.received_amount
          byParty.set(key, cur)
        })
        const rows: PartySummaryRow[] = Array.from(byParty.entries()).map(([partyName, v]) => ({
          partyName,
          totalSales: v.totalSales,
          totalReceived: v.totalReceived,
          totalBalance: v.totalSales - v.totalReceived,
        }))
        setReportData(rows)
      } else if (filters.reportType === 'gst_summary') {
        const rows: GstSummaryRow[] = invoices.map((inv: any) => ({
          date: inv.invoice_date,
          invoiceNumber: inv.invoice_number,
          taxableAmount: Math.max(0, Number(inv.total_amount || 0) - Number(inv.tax_amount || 0)),
          taxAmount: Number(inv.tax_amount || 0),
        }))
        setReportData(rows)
      } else {
        setReportData(null)
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderOutstandingReport = (data: OutstandingRow[] | any) => {
    const list: OutstandingRow[] = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
    return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Outstanding Invoices</h3>
        <div className="text-sm text-gray-600">
          Total Balance: {formatCurrency(list.reduce((s, r) => s + r.balance, 0))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {list.map((row, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.invoiceNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(row.invoiceDate).toLocaleDateString('en-IN')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.customerName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.totalAmount)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.receivedAmount)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{formatCurrency(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    )
  }

  const renderPartySummaryReport = (data: PartySummaryRow[] | any) => {
    const list: PartySummaryRow[] = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
    return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Party Summary</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(list || []).map((row, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.partyName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.totalSales)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.totalReceived)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{formatCurrency(row.totalBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    )
  }

  const renderGstSummaryReport = (data: GstSummaryRow[] | any) => {
    const list: GstSummaryRow[] = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
    return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">GST Summary</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Taxable</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">GST</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {list.map((row, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(row.date).toLocaleDateString('en-IN')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.invoiceNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.taxableAmount)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.taxAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    )
  }

  const handleExportPDF = () => {
    if (!reportData) return
    ReportService.exportToPDF(reportData, filters.reportType, filters)
  }

  const handleExportCSV = () => {
    if (!reportData) return
    ReportService.exportToCSV(reportData, filters.reportType)
  }

  const formatCurrency = (amount: number) => {
    const n = Number(amount)
    const safe = Number.isFinite(n) ? n : 0
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(safe)
  }

  // Badge classes for payment status
  const getStatusBadgeClasses = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'paid') return 'bg-green-100 text-green-700'
    if (s === 'unpaid') return 'bg-amber-100 text-amber-700'
    if (s.includes('partially paid')) return 'bg-blue-100 text-blue-700'
    if (s.includes('overdue')) return 'bg-red-100 text-red-700'
    if (['cancelled','canceled','void'].includes(s)) return 'bg-gray-100 text-gray-700'
    if (s === 'draft') return 'bg-slate-100 text-slate-700'
    return 'bg-gray-100 text-gray-700'
  }

  // Standardized payment status computation for invoices
  const computePaymentStatus = (opts: { total: number, received: number, backend?: string | null }) => {
    const total = Number(opts.total || 0)
    const received = Number(opts.received || 0)
    const backend = (opts.backend || '').toLowerCase()
    const outstanding = Math.max(0, total - received)
    const epsilon = 0.01

    // Honor non-payment states from backend if present
    if (['cancelled', 'canceled', 'void', 'draft'].includes(backend)) {
      return backend.charAt(0).toUpperCase() + backend.slice(1)
    }

    if (Math.abs(outstanding) <= epsilon || received >= total - epsilon) return 'Paid'
    if (received <= epsilon) return 'Unpaid'
    if (received < total - epsilon) return 'Partially Paid'
    
    return 'Unpaid'
  }

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'sales': return BarChart3
      case 'party_statement': return Users
      case 'daybook': return Clock
      case 'outstanding': return DollarSign
      case 'party_summary': return TrendingUp
      case 'gst_summary': return FileText
      default: return FileText
    }
  }

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      )
    }

    if (!reportData) {
      return (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
          <p className="text-gray-600">Select your filters and the report will be generated automatically.</p>
        </div>
      )
    }

    switch (filters.reportType) {
      case 'sales':
        return renderSalesReport(reportData)
      case 'party_statement':
        return renderPartyStatementReport(reportData)
      case 'daybook':
        return renderDaybookReport(reportData)
      case 'outstanding':
        return renderOutstandingReport(reportData)
      case 'party_summary':
        return renderPartySummaryReport(reportData)
      case 'gst_summary':
        return renderGstSummaryReport(reportData)
      default:
        return null
    }
  }

  const renderSalesReport = (data: { data: SalesReportData[], summary: ReportSummary }) => {
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-blue-500 rounded-md p-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-semibold text-gray-900">{data.summary.totalInvoices}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-green-500 rounded-md p-3">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(data.summary.totalSales)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-purple-500 rounded-md p-3">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Received</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(data.summary.totalReceived)}</p>
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
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(data.summary.totalBalance)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Sales Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.data.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(row.invoiceDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.customerPhone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(row.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClasses(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderPartyStatementReport = (data: PartyStatementData[] | any) => {
    const list: PartyStatementData[] = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
    return (
      <div className="space-y-6">
        {list.map((party, index) => (
          <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{party.partyName}</h3>
                  <p className="text-sm text-gray-600">{party.partyPhone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Sales: {formatCurrency(party.totalSales)}</p>
                  <p className="text-sm text-gray-600">Total Received: {formatCurrency(party.totalReceived)}</p>
                  <p className={`text-lg font-semibold ${party.closingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    Balance: {formatCurrency(party.closingBalance)}
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(party.transactions || []).map((txn, txnIndex) => (
                    <tr key={txnIndex} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(txn.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {txn.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {txn.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {txn.debit > 0 ? formatCurrency(txn.debit) : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {txn.credit > 0 ? formatCurrency(txn.credit) : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(txn.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderDaybookReport = (data: DaybookData[]) => {
    return (
      <div className="space-y-6">
        {data.map((day, index) => (
          <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {new Date(day.date).toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                <div className="text-right text-sm">
                  <p className="text-gray-600">Sales: {formatCurrency(day.totalSales)}</p>
                  <p className="text-gray-600">Received: {formatCurrency(day.totalReceived)}</p>
                  <p className={`font-semibold ${day.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    Balance: {formatCurrency(day.totalBalance)}
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {day.entries.map((entry, entryIndex) => (
                    <tr key={entryIndex} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.customerName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(entry.receivedAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(entry.balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.paymentType}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title="Reports"
        subtitle="Generate and export comprehensive business reports"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2 text-emerald-200" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
            {reportData && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2 text-sky-200" />
                  Export CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-white/20 hover:bg-white/30 border border-white/20 transition-colors"
                >
                  <Printer className="h-4 w-4 mr-2 text-indigo-200" />
                  Print PDF
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {REPORT_TYPES.map((reportType) => {
          const Icon = getReportIcon(reportType.value)
          return (
            <div
              key={reportType.value}
              onClick={() => { setReportData(null); setFilters(prev => ({ ...prev, reportType: reportType.value })) }}
              className={`cursor-pointer rounded-lg border-2 p-6 transition-all ${
                filters.reportType === reportType.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center mb-3">
                <Icon className={`h-6 w-6 mr-3 ${
                  filters.reportType === reportType.value ? 'text-primary-600' : 'text-gray-400'
                }`} />
                <h3 className={`text-lg font-medium ${
                  filters.reportType === reportType.value ? 'text-primary-900' : 'text-gray-900'
                }`}>
                  {reportType.label}
                </h3>
              </div>
              <p className="text-sm text-gray-600">{reportType.description}</p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer
              </label>
              <select
                value={filters.customerId || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, customerId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Customers</option>
                {parties.map(party => (
                  <option key={party.id} value={party.id}>
                    {party.partyName}
                  </option>
                ))}
              </select>
            </div>
            {filters.reportType === 'sales' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.statusFilter || 'all'}
                  onChange={(e) => setFilters(prev => ({ ...prev, statusFilter: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partially Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            )}
            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Content */}
      {renderReportContent()}
    </div>
  )
}
