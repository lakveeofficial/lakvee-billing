'use client'

import { Search } from 'lucide-react'
import { useState } from 'react'

interface Booking {
    id: number
    booking_type: 'account' | 'cash'
    booking_date?: string | null
    date?: string | null
    sender?: string | null
    receiver?: string | null
    center?: string | null
    reference_number?: string | null
    consignment_no?: string | null
    net_amount?: number | null
    gross_amount?: number | null
    remarks?: string | null
    weight?: number | null
}

interface BookingsTableProps {
    bookings: Booking[]
    loading: boolean
    selectedKeys: Set<string>
    onToggleSelect: (id: number, type: 'account' | 'cash') => void
    onSelectAll: (checked: boolean) => void
    onGenerateFromSelection: () => void
    searchTerm: string
    onSearchChange: (term: string) => void
}

export default function BookingsTable({
    bookings,
    loading,
    selectedKeys,
    onToggleSelect,
    onSelectAll,
    onGenerateFromSelection,
    searchTerm,
    onSearchChange
}: BookingsTableProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount)
    }

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleDateString('en-IN')
    }

    // Group bookings by party
    const groupedBookings = bookings.reduce((acc, booking) => {
        const party = booking.sender || 'Unknown'
        if (!acc[party]) {
            acc[party] = []
        }
        acc[party].push(booking)
        return acc
    }, {} as Record<string, Booking[]>)

    const [expandedParties, setExpandedParties] = useState<Set<string>>(new Set(Object.keys(groupedBookings)))

    const toggleParty = (party: string) => {
        setExpandedParties(prev => {
            const next = new Set(prev)
            if (next.has(party)) {
                next.delete(party)
            } else {
                next.add(party)
            }
            return next
        })
    }

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-sm text-slate-500">Loading bookings...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-semibold text-slate-700">All Bookings</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search bookings..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-64"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-600">
                        Selected: <span className="font-semibold text-primary-600">{selectedKeys.size}</span>
                    </span>
                    <button
                        onClick={onGenerateFromSelection}
                        disabled={selectedKeys.size === 0}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Generate Bill for Selected
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            <th scope="col" className="w-12 px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={bookings.length > 0 && bookings.every(b => selectedKeys.has(`${b.booking_type}:${b.id}`))}
                                    onChange={(e) => onSelectAll(e.target.checked)}
                                    className="h-4 w-4 text-primary-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                                />
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Date
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Party
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Receiver
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Consignment
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Type
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Amount
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {bookings.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                                    No bookings found for the selected month.
                                </td>
                            </tr>
                        ) : (
                            bookings.map((booking) => {
                                const key = `${booking.booking_type}:${booking.id}`
                                const isSelected = selectedKeys.has(key)
                                const amount = Number(booking.net_amount ?? booking.gross_amount ?? 0)
                                const date = booking.booking_date || booking.date
                                const consignment = booking.reference_number || booking.consignment_no

                                return (
                                    <tr
                                        key={key}
                                        className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-primary-50' : ''}`}
                                    >
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onToggleSelect(booking.id, booking.booking_type)}
                                                className="h-4 w-4 text-primary-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                                            {formatDate(date)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {booking.sender || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                                            {booking.receiver || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-slate-900">
                                            {consignment || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${booking.booking_type === 'account'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-green-100 text-green-800'
                                                }`}>
                                                {booking.booking_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                                            {formatCurrency(amount)}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
