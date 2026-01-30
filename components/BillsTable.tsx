'use client'

import { Printer, Edit, Trash2, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { useState, Fragment } from 'react'

interface Bill {
    id: number
    party_code: string
    party_name: string
    booking_amount: number
    billed_amount: number
    grand_total: number
    status: string
    balance_credit: number
    booking_types?: string
    booking_count?: number
    party_id?: number
    bill_id?: number
    bill_number?: string
    bill_status?: string
    pending_amount?: number
}

interface BillsTableProps {
    bills: Bill[]
    allBookings?: any[]
    loading: boolean
    onGenerateBill: (bill: Bill) => void
    onPrintBill: (bill: Bill) => void
    onEditBill: (bill: Bill) => void
    onDeleteBill: (bill: Bill) => void
    onAddIncome: (bill: Bill) => void
    selectedBills: Set<number>
    onToggleSelect: (id: number) => void
    onSelectAll: (checked: boolean) => void
}

export default function BillsTable({
    bills,
    allBookings = [],
    loading,
    onGenerateBill,
    onPrintBill,
    onEditBill,
    onDeleteBill,
    onAddIncome,
    selectedBills,
    onToggleSelect,
    onSelectAll
}: BillsTableProps) {
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

    const toggleExpand = (id: number) => {
        setExpandedRows(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount)
    }

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-sm text-slate-500">Loading bills...</p>
                </div>
            </div>
        )
    }

    if (bills.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-8 text-center">
                    <div className="mx-auto h-12 w-12 text-slate-400">
                        <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No bills found</h3>
                    <p className="mt-1 text-sm text-slate-500">No bookings or bills for the selected month.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="w-12 px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={bills.length > 0 && bills.every(b => selectedBills.has(b.id))}
                                    onChange={(e) => onSelectAll(e.target.checked)}
                                    className="h-4 w-4 text-primary-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                                />
                            </th>
                            <th scope="col" className="w-12 px-4 py-3"></th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Client Code
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Client Name
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Bookings
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Booking Amount
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Billed Amount
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Grand Total
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Balance
                            </th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {bills.map((bill) => {
                            const isExpanded = expandedRows.has(bill.id)
                            const isSelected = selectedBills.has(bill.id)

                            // Filter bookings for this party across allBookings
                            const partyBookings = allBookings.filter(b =>
                                String(b.sender || '').trim().toLowerCase() === String(bill.party_name || '').trim().toLowerCase()
                            )

                            return (
                                <Fragment key={bill.id}>
                                    <tr
                                        className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-primary-50' : ''}`}
                                    >
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onToggleSelect(bill.id)}
                                                className="h-4 w-4 text-primary-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            {partyBookings.length > 0 && (
                                                <button
                                                    onClick={() => toggleExpand(bill.id)}
                                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {bill.party_code}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                                            {bill.party_name}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {bill.booking_count || 0} {bill.booking_types ? `(${bill.booking_types})` : ''}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                                            {formatCurrency(bill.booking_amount)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                                            {formatCurrency(bill.billed_amount)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-bold text-slate-900">
                                            {formatCurrency(bill.grand_total || 0)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <StatusBadge
                                                status={bill.status}
                                                onClick={bill.bill_id ? () => onPrintBill(bill) : undefined}
                                            />
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="font-medium text-slate-900">{formatCurrency(bill.balance_credit)}</span>
                                                <button
                                                    onClick={() => onAddIncome(bill)}
                                                    className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
                                                    title="Add Income"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {bill.status === 'Pending' && (
                                                    <button
                                                        onClick={() => onGenerateBill(bill)}
                                                        className="px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-xs font-medium"
                                                    >
                                                        Generate Bill
                                                    </button>
                                                )}
                                                {(bill.status === 'Billed' || bill.status === 'Partially Paid') && (
                                                    <>
                                                        <button
                                                            onClick={() => onPrintBill(bill)}
                                                            className="p-1.5 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                                            title="Print Bill"
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => onEditBill(bill)}
                                                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Edit Bill"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => onDeleteBill(bill)}
                                                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Delete Bill"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                                {bill.status === 'Paid' && (
                                                    <>
                                                        <button
                                                            onClick={() => onPrintBill(bill)}
                                                            className="p-1.5 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                                            title="Print Bill"
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => onDeleteBill(bill)}
                                                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Delete Bill"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {isExpanded && partyBookings.length > 0 && (
                                        <tr>
                                            <td colSpan={10} className="px-12 py-4 bg-slate-50/50">
                                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                                    <table className="min-w-full divide-y divide-gray-100">
                                                        <thead className="bg-slate-50">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                                                <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Receiver</th>
                                                                <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Consignment</th>
                                                                <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                                                <th className="px-4 py-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {partyBookings.map((b) => (
                                                                <tr key={`${b.booking_type}:${b.id}`} className="hover:bg-slate-50/50">
                                                                    <td className="px-4 py-2 text-xs text-slate-600">
                                                                        {new Date(b.booking_date || b.date).toLocaleDateString('en-IN')}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-xs text-slate-600">{b.receiver}</td>
                                                                    <td className="px-4 py-2 text-xs font-mono text-slate-900">{b.reference_number || b.consignment_no}</td>
                                                                    <td className="px-4 py-2">
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase ${b.booking_type === 'account' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                                                                            }`}>
                                                                            {b.booking_type}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-2 text-xs text-right font-medium text-slate-900">
                                                                        {formatCurrency(Number(b.net_amount ?? b.gross_amount ?? 0))}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
