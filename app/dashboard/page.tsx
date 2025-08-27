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
  AlertCircle
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { useRouter } from 'next/navigation'

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
        const partiesRes = await fetch('/api/parties?limit=1&page=1', { 
          headers,
          credentials: 'include' 
        })
        
        if (!partiesRes.ok) {
          if (partiesRes.status === 401) {
            router.push('/')
            return
          }
          throw new Error('Failed to fetch parties')
        }
        
        const partiesJson = await partiesRes.json()
        const totalParties = partiesJson?.pagination?.totalCount || 0

        // Invoices - get this month and overall (using reasonable limit)
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = today.getMonth() // 0-index
        const firstOfMonth = new Date(yyyy, mm, 1)
        const dateTo = today.toISOString().split('T')[0]
        const dateFromMonth = firstOfMonth.toISOString().split('T')[0]

        const invParams = new URLSearchParams()
        invParams.set('limit', '1') // Just get count
        invParams.set('page', '1')
        invParams.set('date_from', dateFromMonth)
        invParams.set('date_to', dateTo)
        
        const invoicesMonthRes = await fetch(`/api/invoices?${invParams.toString()}`, { 
          headers,
          credentials: 'include' 
        })
        
        if (!invoicesMonthRes.ok) {
          throw new Error('Failed to fetch invoices')
        }
        
        const invoicesMonthJson = await invoicesMonthRes.json()
        const thisMonthSales = Array.isArray(invoicesMonthJson?.data)
          ? invoicesMonthJson.data.reduce((sum: number, inv: any) => sum + Number(inv.display_total_amount || 0), 0)
          : 0
        const pendingMonth = Array.isArray(invoicesMonthJson?.data)
          ? invoicesMonthJson.data.reduce((sum: number, inv: any) => {
              const total = Number(inv.display_total_amount || 0)
              const received = Number(inv.received_amount || 0)
              const pending = Math.max(total - received, 0)
              return sum + pending
            }, 0)
          : 0
        const todayInvoicesCount = invoicesMonthJson?.data?.filter((inv: any) => 
          inv.invoice_date === dateTo
        ).length || 0
        const totalInvoicesMonth = invoicesMonthJson?.pagination?.totalCount || 0

        // Overall invoices count (no date filters)
        const invoicesOverallRes = await fetch(`/api/invoices?limit=1&page=1`, {
          headers,
          credentials: 'include'
        })
        if (!invoicesOverallRes.ok) {
          throw new Error('Failed to fetch overall invoices')
        }
        const invoicesOverallJson = await invoicesOverallRes.json()
        const totalInvoicesOverall = invoicesOverallJson?.pagination?.totalCount || 0
        
        // Update stats
        setStats({
          totalParties,
          totalInvoicesOverall,
          totalInvoicesMonth: totalInvoicesMonth,
          totalSalesMonth: thisMonthSales,
          pendingPayments: pendingMonth,
          todayInvoices: todayInvoicesCount,
        })

        // Get recent invoices
        const recentRes = await fetch(`/api/invoices?limit=5&page=1&sort=created_at&order=desc`, { 
          headers,
          credentials: 'include' 
        })
        
        if (recentRes.ok) {
          const recentData = await recentRes.json()
          setRecentInvoices(recentData.data || [])
        }

        // All stats are already set in the first part of the function
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Failed to load dashboard data. Please try again.')
        if (err instanceof Error && err.message.includes('401')) {
          router.push('/')
        }
        setStats({ 
          totalParties: 0, 
          totalInvoicesOverall: 0, 
          totalInvoicesMonth: 0, 
          totalSalesMonth: 0, 
          pendingPayments: 0, 
          todayInvoices: 0 
        })
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
      name: 'Total Invoices (Overall)',
      value: stats.totalInvoicesOverall,
      icon: FileText,
      color: 'from-emerald-500 to-green-400',
      href: '/dashboard/invoices'
    },
    {
      name: 'This Month Invoices',
      value: stats.totalInvoicesMonth,
      icon: CheckCircle,
      color: 'from-indigo-500 to-blue-500',
      href: '/dashboard/invoices?dateRange=month'
    },
    {
      name: 'This Month Sales',
      value: formatCurrency(stats.totalSalesMonth),
      icon: IndianRupee,
      color: 'from-purple-500 to-fuchsia-500',
      href: '/dashboard/reports'
    },
    {
      name: 'Pending (This Month)',
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
        title="Welcome back!"
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
    </div>
  )
}
