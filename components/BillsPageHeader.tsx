'use client'

import { Search, Calendar, FileText, IndianRupee, TrendingUp, AlertCircle } from 'lucide-react'

interface SummaryCard {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}

interface BillsPageHeaderProps {
  selectedMonth: string
  onMonthChange: (month: string) => void
  searchTerm: string
  onSearchChange: (term: string) => void
  summaryCards: SummaryCard[]
}

import PageHeader from './PageHeader'

export default function BillsPageHeader({
  selectedMonth,
  onMonthChange,
  searchTerm,
  onSearchChange,
  summaryCards
}: BillsPageHeaderProps) {
  // Convert "Jan 2026" to "2026-01" for input
  const toInputValue = (month: string) => {
    const [m, y] = month.split(' ')
    const monthMap: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    }
    return `${y}-${monthMap[m] || '01'}`
  }

  // Convert "2026-01" to "Jan 2026"
  const fromInputValue = (value: string) => {
    const [year, month] = value.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bills Management"
        subtitle="Generate and manage bills for your parties"
        actions={
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Month Selector */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="month"
                value={toInputValue(selectedMonth)}
                onChange={(e) => onMonthChange(fromInputValue(e.target.value))}
                className="pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 shadow-sm hover:border-gray-400 transition-colors"
                style={{ colorScheme: 'light' }}
              />
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search parties or bills..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-72 bg-slate-50 shadow-sm hover:border-gray-400 transition-colors"
              />
            </div>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon
          let iconBg = 'bg-indigo-50 text-indigo-600'
          if (card.color.includes('green') || card.color.includes('emerald')) iconBg = 'bg-emerald-50 text-emerald-600'
          if (card.color.includes('orange') || card.color.includes('amber')) iconBg = 'bg-amber-50 text-amber-600'
          if (card.color.includes('red')) iconBg = 'bg-red-50 text-red-600'
          if (card.color.includes('blue')) iconBg = 'bg-blue-50 text-blue-600'

          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-indigo-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                </div>
                <div className={`rounded-xl p-3 ${iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
