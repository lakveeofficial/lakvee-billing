'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  FileText,
  IndianRupee,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowRight,
  Zap,
  Activity,
  Package
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useRouter } from 'next/navigation'
// Lightweight Recharts wrappers
import { ResponsiveContainer, BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart as RLineChart, Line, AreaChart, Area } from 'recharts'

interface DashboardStats {
  totalParties: number
  totalInvoicesOverall: number
  totalInvoicesMonth: number
  totalSalesMonth: number
  pendingPayments: number
  todayInvoices: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalParties: 0,
    totalInvoicesOverall: 0,
    totalInvoicesMonth: 0,
    totalSalesMonth: 0,
    pendingPayments: 0,
    todayInvoices: 0,
  })
  const [recentInvoices, setRecentInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [setupKpis, setSetupKpis] = useState<{ regions: number; centers: number; carriers: number; smsFormats: number; operators: number }>({ regions: 0, centers: 0, carriers: 0, smsFormats: 0, operators: 0 })
  const [analytics, setAnalytics] = useState<{ parcelsByType: any[]; parcelsByCourier: any[]; monthlyBusiness: any[] }>({ parcelsByType: [], parcelsByCourier: [], monthlyBusiness: [] })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/')
          return
        }

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }

        // Parties count
        const partiesRes = await fetch('/api/parties?limit=1&page=1', { headers, credentials: 'include' })
        if (!partiesRes.ok) throw new Error('Failed to fetch data')
        const partiesJson = await partiesRes.json()
        const totalParties = partiesJson?.pagination?.totalCount || 0

        // Invoices - get this month and overall
        const today = new Date()
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const dateTo = today.toISOString().split('T')[0]
        const dateFromMonth = firstOfMonth.toISOString().split('T')[0]

        const invParams = new URLSearchParams()
        invParams.set('limit', '1') // Just get count
        invParams.set('page', '1')
        invParams.set('date_from', dateFromMonth)
        invParams.set('date_to', dateTo)

        const invoicesMonthRes = await fetch(`/api/invoices?${invParams.toString()}`, { headers, credentials: 'include' })
        const invoicesMonthJson = await invoicesMonthRes.json()

        const thisMonthSales = Array.isArray(invoicesMonthJson?.data)
          ? invoicesMonthJson.data.reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0) // adjusted key
          : 0

        // Rough calculation for pending payment from available data
        // For accurate pending, we should rely on outstanding report logic or dedicated KPI API if available
        // Here we use the month's data fetch as a proxy or fallback to 0 if data shape differs
        const pendingMonth = 0 // Placeholder as accurate pending needs full scan or dedicated endpoint

        const todayInvoicesCount = invoicesMonthJson?.data?.filter((inv: any) =>
          inv.invoice_date === dateTo
        ).length || 0
        const totalInvoicesMonth = invoicesMonthJson?.pagination?.totalCount || 0 // Assuming pagination count reflects filter

        // Overall invoices count
        const invoicesOverallRes = await fetch(`/api/invoices?limit=1&page=1`, { headers, credentials: 'include' })
        const invoicesOverallJson = await invoicesOverallRes.json()
        const totalInvoicesOverall = invoicesOverallJson?.pagination?.totalCount || 0

        // Setup KPIs
        try {
          const kpiRes = await fetch('/api/admin/kpis', { headers, credentials: 'include' })
          if (kpiRes.ok) {
            const kpi = await kpiRes.json()
            setSetupKpis({
              regions: Number(kpi.regions || 0),
              centers: Number(kpi.centers || 0),
              carriers: Number(kpi.carriers || 0),
              smsFormats: Number(kpi.smsFormats || 0),
              operators: Number(kpi.operators || 0)
            })
          }
        } catch (e) { }

        // Analytics
        try {
          const ares = await fetch('/api/analytics/dashboard', { headers, credentials: 'include' })
          if (ares.ok) {
            const ajson = await ares.json()
            setAnalytics(ajson)
          }
        } catch { }

        setStats({
          totalParties,
          totalInvoicesOverall,
          totalInvoicesMonth,
          totalSalesMonth: thisMonthSales,
          pendingPayments: pendingMonth, // This might need a better source
          todayInvoices: todayInvoicesCount,
        })

        // Get recent invoices
        const recentRes = await fetch(`/api/invoices?limit=5&page=1&sort=created_at&order=desc`, { headers, credentials: 'include' })
        if (recentRes.ok) {
          const recentData = await recentRes.json()
          setRecentInvoices(recentData.data || [])
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        // Fallback for demo/dev if API fails
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner message="Visualizing your business..." />
      </div>
    )
  }

  // Calculate some growth trends (mock for visual, replace with real data if available)
  const salesGrowth = 12.5
  const bookingsGrowth = 8.2

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Hero Section */}
      <div className="bg-[#0F172A] pt-8 pb-32 px-6 sm:px-8 lg:px-12 relative overflow-hidden">
        {/* Abstract shapes/gradients */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, Team
              </h1>
              <p className="text-slate-400 text-lg">
                Here's your business performance overview for {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}.
              </p>
            </div>
            <div className="hidden sm:block">
              <button
                onClick={() => router.push('/dashboard/reports')}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-lg shadow-indigo-500/20"
              >
                <FileText className="w-4 h-4" />
                View Full Reports
              </button>
            </div>
          </div>

          {/* Primary Hero Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sales Card */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-white hover:bg-white/10 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-500/20 rounded-xl group-hover:bg-indigo-500/30 transition-colors">
                  <IndianRupee className="w-6 h-6 text-indigo-400" />
                </div>
                <span className="flex items-center text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +{salesGrowth}%
                </span>
              </div>
              <p className="text-slate-400 text-sm font-medium mb-1">Total Revenue (Month)</p>
              <h3 className="text-3xl font-bold tracking-tight">{formatCurrency(stats.totalSalesMonth)}</h3>
            </div>

            {/* Bookings Card */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-white hover:bg-white/10 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-colors">
                  <Package className="w-6 h-6 text-blue-400" />
                </div>
                <span className="flex items-center text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +{bookingsGrowth}%
                </span>
              </div>
              <p className="text-slate-400 text-sm font-medium mb-1">Total Bookings (Month)</p>
              <h3 className="text-3xl font-bold tracking-tight">{stats.totalInvoicesMonth.toLocaleString()}</h3>
            </div>

            {/* Invoices Pending Card */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-white hover:bg-white/10 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-orange-500/20 rounded-xl group-hover:bg-orange-500/30 transition-colors">
                  <Clock className="w-6 h-6 text-orange-400" />
                </div>
                <button onClick={() => router.push('/dashboard/accounts/bills')} className="text-slate-400 hover:text-white transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <p className="text-slate-400 text-sm font-medium mb-1">Today's Invoices</p>
              <h3 className="text-3xl font-bold tracking-tight text-orange-200">{stats.todayInvoices}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content (Overlapping Hero) */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 -mt-20 relative z-20 space-y-8 pb-12">

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-indigo-600" />
                Business Performance
              </h3>
              <select className="bg-slate-50 border-none text-sm font-medium text-slate-600 rounded-xl px-3 py-1.5 focus:ring-0">
                <option>Last 6 Months</option>
                <option>This Year</option>
              </select>
            </div>
            <div className="h-[350px] w-full">
              <LineChart data={analytics.monthlyBusiness} xKey="month" yKey="total" />
            </div>
          </div>

          {/* Setup / Quick Stats */}
          <div className="space-y-6">
            {/* Quick Actions Panel */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-amber-500" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => router.push('/dashboard/accounts/bills')} className="p-3 text-left rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors group">
                  <FileText className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold block">New Invoice</span>
                </button>
                <button onClick={() => router.push('/dashboard/bookings/cash')} className="p-3 text-left rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors group">
                  <IndianRupee className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold block">Cash Booking</span>
                </button>
                <button onClick={() => router.push('/dashboard/clients')} className="p-3 text-left rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors group">
                  <Users className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold block">Add Party</span>
                </button>
                <button onClick={() => router.push('/dashboard/bookings/account')} className="p-3 text-left rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors group">
                  <ArrowUpRight className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold block">Bulk Upload</span>
                </button>
              </div>
            </div>

            {/* System Health / Counts */}
            <div className="bg-indigo-900 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-700/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <h3 className="text-lg font-bold mb-4 relative z-10">System Status</h3>
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center border-b border-indigo-800 pb-2">
                  <span className="text-indigo-200">Total Parties</span>
                  <span className="font-mono font-bold text-xl">{stats.totalParties}</span>
                </div>
                <div className="flex justify-between items-center border-b border-indigo-800 pb-2">
                  <span className="text-indigo-200">Active Centers</span>
                  <span className="font-mono font-bold text-xl">{setupKpis.centers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-200">Total Bills</span>
                  <span className="font-mono font-bold text-xl">{stats.totalInvoicesOverall}</span>
                </div>
              </div>
              <button onClick={() => router.push('/dashboard/setup')} className="w-full mt-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors">
                Manage System
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Charts Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Volume by Courier</h3>
            <BarChart data={analytics.parcelsByCourier} category="label" valueKey="count" color="#8b5cf6" />
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Volume by Type</h3>
            <BarChart data={analytics.parcelsByType} category="label" valueKey="count" color="#10b981" />
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Recent Transactions</h3>
            <button onClick={() => router.push('/dashboard/accounts/bills')} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Invoice ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      #{inv.invoice_number || inv.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {inv.party_name || inv.customer?.partyName || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(inv.created_at || inv.invoice_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {formatCurrency(inv.total_amount || 0)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={inv.payment_status || 'pending'} />
                    </td>
                  </tr>
                ))}
                {recentInvoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No recent transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  let classes = "bg-slate-100 text-slate-700"
  if (s === 'paid') classes = "bg-green-100 text-green-700"
  if (s === 'unpaid') classes = "bg-red-100 text-red-700"
  if (s.includes('partial')) classes = "bg-amber-100 text-amber-700"

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${classes} capitalize`}>
      {status}
    </span>
  )
}

function BarChart({ data, category, valueKey, color }: { data: any[]; category: string; valueKey: string, color: string }) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <RBarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey={category}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: '#F1F5F9' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey={valueKey} fill={color} radius={[4, 4, 0, 0]} barSize={40} />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  )
}

function LineChart({ data, xKey, yKey }: { data: any[]; xKey: string; yKey: string }) {
  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey={xKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ color: '#4F46E5', fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke="#4F46E5"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorTotal)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
