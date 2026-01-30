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
  IndianRupee,
  Clock,
  Search,
  ChevronDown,
  RefreshCw
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
import LoadingSpinner from '@/components/LoadingSpinner'

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
      const res = await fetch(`/api/parties?limit=1000&page=1`, { credentials: 'include' })
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
    setLoading(true)

    try {
      // Build query params for invoices API
      const params = new URLSearchParams()
      if (filters.dateFrom) params.set('date_from', filters.dateFrom)
      if (filters.dateTo) params.set('date_to', filters.dateTo)
      if (filters.customerId && filters.customerId !== 'all') params.set('party_id', String(filters.customerId))
      params.set('limit', '500') // Higher limit for reports
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
        party_gstin: row.party_gstin,
        subtotal: Number(row.subtotal || 0),
        tax_amount: Number(row.tax_amount || 0),
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
          if (f === 'partial') return s.includes('partial')
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
        // ... (Party Statement Logic)
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
          return { partyName, partyPhone: '', transactions, openingBalance: 0, closingBalance: running, totalSales, totalReceived }
        })
        setReportData(statements)
      } else if (filters.reportType === 'daybook') {
        // ... (Daybook Logic)
        const byDate = new Map<string, any[]>()
        invoices.forEach((inv: any) => {
          const date = inv.invoice_date
          if (!byDate.has(date)) byDate.set(date, [])
          byDate.get(date)!.push(inv)
        })
        const daybook = Array.from(byDate.entries()).map(([date, invs]) => {
          const entries = invs.map((inv) => ({
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
          .filter((inv: any) => (inv.total_amount - inv.received_amount) > 1) // Filter small diffs
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
          taxableAmount: inv.subtotal || (inv.total_amount - inv.tax_amount), // Fallback if subtotal missing
          taxAmount: inv.tax_amount,
          gstin: inv.party_gstin
        }))
        setReportData(rows)
      } else {
        setReportData(null)
      }
    } catch (error) {
      console.error('Error generating report:', error)
      // alert('Failed to generate report. Please try again.') // Removing alert for cleaner UI, console enough
    } finally {
      setLoading(false)
    }
  }

  // Helpers
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)

  const computePaymentStatus = (opts: { total: number, received: number, backend?: string | null }) => {
    const total = Number(opts.total || 0)
    const received = Number(opts.received || 0)
    const backend = (opts.backend || '').toLowerCase()
    const outstanding = Math.max(0, total - received)
    if (['cancelled', 'canceled', 'void', 'draft'].includes(backend)) return backend.charAt(0).toUpperCase() + backend.slice(1)
    if (Math.abs(outstanding) <= 1 || received >= total - 1) return 'Paid'
    if (received <= 1) return 'Unpaid'
    return 'Partially Paid'
  }

  const getStatusBadgeClasses = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'paid') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    if (s === 'unpaid') return 'bg-red-100 text-red-700 border-red-200'
    if (s.includes('partial')) return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-slate-100 text-slate-700'
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      {/* Premium Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center justify-center md:justify-start gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Financial Reports
            </h1>
            <p className="text-slate-500 text-sm mt-1">Export comprehensive business insights</p>
          </div>
          <div className="flex items-center gap-3">
            {reportData && (
              <>
                <button onClick={() => ReportService.exportToCSV(reportData, filters.reportType)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button onClick={() => ReportService.exportToPDF(reportData, filters.reportType, filters)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Print PDF</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Segmented Control) */}
        <div className="max-w-7xl mx-auto px-6 mt-2 overflow-x-auto">
          <div className="flex space-x-6 border-b border-transparent">
            {REPORT_TYPES.map((type) => {
              const isActive = filters.reportType === type.value
              return (
                <button
                  key={type.value}
                  onClick={() => { setReportData(null); setFilters(prev => ({ ...prev, reportType: type.value })) }}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                  {type.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Control Panel (Filters) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-8">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold">
            <Filter className="w-4 h-4 text-indigo-500" />
            <h3 className="uppercase tracking-wider text-xs">Report Configuration</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Date Range</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full pl-3 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all dark:[color-scheme:light]"
                  />
                </div>
                <span className="text-slate-400">-</span>
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full pl-3 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all dark:[color-scheme:light]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Customer / Party</label>
              <div className="relative">
                <select
                  value={filters.customerId}
                  onChange={(e) => setFilters(prev => ({ ...prev, customerId: e.target.value }))}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                >
                  <option value="all">All Parties</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.partyName}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Status</label>
              <div className="relative">
                <select
                  value={filters.statusFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, statusFilter: e.target.value as any }))}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partially Paid</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={loading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm shadow-indigo-200"
              >
                {loading ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
                Refresh Report
              </button>
            </div>
          </div>
        </div>

        {/* Report Data Content */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64 bg-white/50 backdrop-blur-sm rounded-xl border border-dashed border-slate-300">
              <LoadingSpinner message="Crunching numbers..." />
            </div>
          ) : !reportData ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
              <FileText className="w-12 h-12 mb-3 opacity-20" />
              <p>Select filters above to generate report</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {renderReportContent(filters, reportData, formatCurrency, getStatusBadgeClasses)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Extracted Render Component for cleanliness
function renderReportContent(filters: ReportFilters, reportData: any, formatCurrency: any, getStatusBadgeClasses: any) {
  if (filters.reportType === 'sales') {
    const { data, summary } = reportData
    return (
      <div className="space-y-6">
        {/* Hero Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard label="Total Invoices" value={summary.totalInvoices} icon={FileText} color="blue" />
          <SummaryCard label="Total Sales" value={formatCurrency(summary.totalSales)} icon={IndianRupee} color="emerald" />
          <SummaryCard label="Received" value={formatCurrency(summary.totalReceived)} icon={TrendingUp} color="violet" />
          <SummaryCard label="Outstanding Balance" value={formatCurrency(summary.totalBalance)} icon={Users} color="amber" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Invoice</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-right">Received</th>
                  <th className="px-6 py-4 text-right">Balance</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row: SalesReportData, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-indigo-600">{row.invoiceNumber}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(row.invoiceDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4 text-slate-700 font-medium">{row.customerName}</td>
                    <td className="px-6 py-4 text-right font-medium">{formatCurrency(row.totalAmount)}</td>
                    <td className="px-6 py-4 text-right text-emerald-600">{formatCurrency(row.receivedAmount)}</td>
                    <td className="px-6 py-4 text-right text-red-600">{formatCurrency(row.balance)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(row.status)}`}>
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
  // Simplified Party Statement render (can be expanded similarly)
  if (filters.reportType === 'party_statement') {
    return (
      <div className="space-y-8">
        {reportData.map((party: any, i: number) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{party.partyName}</h3>
              <div className="text-sm font-medium">Closing Balance: <span className={party.closingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}>{formatCurrency(party.closingBalance)}</span></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-2">Date</th>
                    <th className="px-6 py-2">Description</th>
                    <th className="px-6 py-2 text-right">Debit</th>
                    <th className="px-6 py-2 text-right">Credit</th>
                    <th className="px-6 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {party.transactions.map((tx: any, j: number) => (
                    <tr key={j} className="hover:bg-slate-50">
                      <td className="px-6 py-3">{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-3">{tx.description} {tx.invoiceNumber ? `#${tx.invoiceNumber}` : ''}</td>
                      <td className="px-6 py-3 text-right">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
                      <td className="px-6 py-3 text-right">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
                      <td className="px-6 py-3 text-right font-medium text-slate-700">{formatCurrency(tx.balance)}</td>
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

  // GST Summary
  if (filters.reportType === 'gst_summary') {
    const totalTax = reportData.reduce((s: number, r: any) => s + r.taxAmount, 0)
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SummaryCard label="Total Taxable Value" value={formatCurrency(reportData.reduce((s: number, r: any) => s + r.taxableAmount, 0))} icon={IndianRupee} color="blue" />
          <SummaryCard label="Total GST Amount" value={formatCurrency(totalTax)} icon={TrendingUp} color="emerald" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Invoice No</th>
                <th className="px-6 py-4">GSTIN</th>
                <th className="px-6 py-4 text-right">Taxable</th>
                <th className="px-6 py-4 text-right">Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-500">{new Date(row.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-6 py-4 font-medium">{row.invoiceNumber}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{row.gstin || 'N/A'}</td>
                  <td className="px-6 py-4 text-right">{formatCurrency(row.taxableAmount)}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-800">{formatCurrency(row.taxAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Fallback for other types
  return (
    <div className="bg-white p-6 rounded-xl border border-dashed border-slate-300 text-center">
      <p className="text-slate-500">Report visualization for <strong>{filters.reportType}</strong> is coming soon.</p>
      <pre className="text-left bg-slate-100 p-4 mt-4 rounded overflow-auto text-xs max-h-64">
        {JSON.stringify(reportData, null, 2)}
      </pre>
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600'
  }
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${colors[color] || colors.blue}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  )
}
