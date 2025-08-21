'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  FileText, 
  DollarSign, 
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'

interface DashboardStats {
  totalParties: number
  totalInvoices: number
  totalSales: number
  pendingPayments: number
  todayInvoices: number
  thisMonthSales: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalParties: 0,
    totalInvoices: 0,
    totalSales: 0,
    pendingPayments: 0,
    todayInvoices: 0,
    thisMonthSales: 0
  })
  const [recentInvoices, setRecentInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (userData) setUser(JSON.parse(userData))

    const fetchData = async () => {
      try {
        setLoading(true)
        // Parties count
        const partiesRes = await fetch('/api/parties?limit=100&page=1', { credentials: 'include' })
        const partiesJson = partiesRes.ok ? await partiesRes.json() : { data: [] }
        const totalParties = Array.isArray(partiesJson?.data) ? partiesJson.data.length : 0

        // Invoices - get this month and overall (using reasonable limit)
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = today.getMonth() // 0-index
        const firstOfMonth = new Date(yyyy, mm, 1)
        const dateTo = today.toISOString().split('T')[0]
        const dateFromMonth = firstOfMonth.toISOString().split('T')[0]

        const invParams = new URLSearchParams()
        invParams.set('limit', '100')
        invParams.set('page', '1')
        // Use month range to compute both thisMonth and up-to-date totals
        invParams.set('date_from', dateFromMonth)
        invParams.set('date_to', dateTo)
        const invoicesMonthRes = await fetch(`/api/invoices?${invParams.toString()}`, { credentials: 'include' })
        const invoicesMonthJson = invoicesMonthRes.ok ? await invoicesMonthRes.json() : { data: [] }
        const invoicesMonth: any[] = Array.isArray(invoicesMonthJson?.data) ? invoicesMonthJson.data : []

        // For overall we try a slightly larger window (fallback to same if needed)
        const invAllParams = new URLSearchParams()
        invAllParams.set('limit', '100')
        invAllParams.set('page', '1')
        const invoicesAllRes = await fetch(`/api/invoices?${invAllParams.toString()}`, { credentials: 'include' })
        const invoicesAllJson = invoicesAllRes.ok ? await invoicesAllRes.json() : { data: [] }
        const invoicesAll: any[] = Array.isArray(invoicesAllJson?.data) ? invoicesAllJson.data : []

        // Recent invoices (latest 5)
        const recent = [...invoicesAll]
          .sort((a, b) => new Date(b.created_at || b.invoice_date).getTime() - new Date(a.created_at || a.invoice_date).getTime())
          .slice(0, 5)
        setRecentInvoices(recent)

        const toNum = (v: any) => Number(v || 0)
        const monthSales = invoicesMonth.reduce((s, r) => s + toNum(r.total_amount), 0)

        const totalInvoices = invoicesAll.length
        const totalSales = invoicesAll.reduce((s, r) => s + toNum(r.total_amount), 0)
        const pendingPayments = invoicesAll.reduce((s, r) => s + Math.max(0, toNum(r.total_amount) - toNum(r.received_amount)), 0)

        const todayStr = new Date().toISOString().split('T')[0]
        const todayInvoices = invoicesAll.filter(r => (r.invoice_date || '').slice(0, 10) === todayStr).length

        setStats({
          totalParties,
          totalInvoices,
          totalSales,
          pendingPayments,
          todayInvoices,
          thisMonthSales: monthSales,
        })
      } catch (e) {
        console.error('Failed to load dashboard data', e)
        setStats({ totalParties: 0, totalInvoices: 0, totalSales: 0, pendingPayments: 0, todayInvoices: 0, thisMonthSales: 0 })
        setRecentInvoices([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const statCards = [
    {
      name: 'Total Parties',
      value: stats.totalParties,
      icon: Users,
      color: 'from-blue-500 to-sky-400',
      href: '/dashboard/parties'
    },
    {
      name: 'Total Invoices',
      value: stats.totalInvoices,
      icon: FileText,
      color: 'from-emerald-500 to-green-400',
      href: '/dashboard/invoices'
    },
    {
      name: 'Total Sales',
      value: formatCurrency(stats.totalSales),
      icon: DollarSign,
      color: 'from-purple-500 to-fuchsia-500',
      href: '/dashboard/reports'
    },
    {
      name: 'Pending Payments',
      value: formatCurrency(stats.pendingPayments),
      icon: AlertCircle,
      color: 'from-rose-500 to-orange-500',
      href: '/dashboard/invoices?status=unpaid'
    }
  ]

  const recentActivities = recentInvoices.map((inv, idx) => ({
    id: idx,
    type: 'invoice',
    description: `Invoice #${inv.invoice_number || inv.invoiceNumber} for ${inv.party_name || inv.customer?.partyName || 'Customer'}`,
    time: new Date(inv.created_at || inv.invoice_date).toLocaleString('en-IN'),
    status: (Number(inv.received_amount || 0) >= Number(inv.total_amount || 0)) ? 'success' : (Number(inv.received_amount || 0) > 0 ? 'info' : 'warning')
  }))

  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title={`Welcome back, ${user?.username || 'User'}!`}
        subtitle="Here's what's happening with your billing portal today."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className={`rounded-xl shadow p-6 hover:shadow-lg transition cursor-pointer bg-gradient-to-r ${stat.color} text-white`}
            onClick={() => window.location.href = stat.href}
          >
            <div className="flex items-center">
              <div className={`rounded-md p-3 bg-white/20`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium opacity-90">{stat.name}</p>
                <p className="text-2xl font-semibold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a
              href="/dashboard/invoices/new"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-5 w-5 text-primary-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">Create New Invoice</span>
            </a>
            <a
              href="/dashboard/parties/new"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="h-5 w-5 text-primary-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">Add New Party</span>
            </a>
            <a
              href="/dashboard/upload"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TrendingUp className="h-5 w-5 text-primary-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">Upload CSV Data</span>
            </a>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                  activity.status === 'success' ? 'bg-green-400' :
                  activity.status === 'warning' ? 'bg-yellow-400' :
                  activity.status === 'info' ? 'bg-blue-400' : 'bg-gray-400'
                }`} />
                <div className="ml-3 flex-1">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="mt-6 bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Invoices Created</p>
              <p className="text-lg font-semibold text-gray-900">{stats.todayInvoices}</p>
            </div>
          </div>
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-600">This Month Sales</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(stats.thisMonthSales)}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Last Login</p>
              <p className="text-lg font-semibold text-gray-900">
                {user?.loginTime ? new Date(user.loginTime).toLocaleTimeString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
