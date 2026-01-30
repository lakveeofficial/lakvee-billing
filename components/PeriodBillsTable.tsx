'use client'

import { FileText, Printer, Trash2 } from 'lucide-react'

interface PeriodBill {
    id: number
    bill_number: string
    bill_date: string
    total_amount: number
    status: string
    party_id: number
    party_name: string
    start_date: string
    end_date: string
    booking_count: number
    total_paid: number
}

interface PeriodBillsTableProps {
    bills: PeriodBill[]
    loading: boolean
    onPrintBill: (bill: PeriodBill) => void
    onDeleteBill: (bill: PeriodBill) => void
}

export default function PeriodBillsTable({
    bills,
    loading,
    onPrintBill,
    onDeleteBill
}: PeriodBillsTableProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 0
        }).format(amount)
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid':
                return 'bg-green-100 text-green-800'
            case 'partially paid':
                return 'bg-yellow-100 text-yellow-800'
            case 'pending':
                return 'bg-orange-100 text-orange-800'
            default:
                return 'bg-slate-100 text-gray-800'
        }
    }

    const getBalance = (bill: PeriodBill) => {
        return bill.total_amount - (bill.total_paid || 0)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    if (bills.length === 0) {
        return (
            <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Period Bills</h3>
                <p className="text-slate-600">Generate your first period bill to get started</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Bill Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Party Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Period
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Bookings
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Total Amount
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Paid
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Balance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {bills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{bill.bill_number}</div>
                                <div className="text-xs text-slate-500">{formatDate(bill.bill_date)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{bill.party_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-slate-900">
                                    {formatDate(bill.start_date)}
                                </div>
                                <div className="text-xs text-slate-500">
                                    to {formatDate(bill.end_date)}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-slate-900">{bill.booking_count || 0}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="text-sm font-medium text-slate-900">
                                    ₹{formatCurrency(bill.total_amount)}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="text-sm text-slate-900">
                                    ₹{formatCurrency(bill.total_paid || 0)}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="text-sm font-medium text-slate-900">
                                    ₹{formatCurrency(getBalance(bill))}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(bill.status)}`}>
                                    {bill.status || 'Pending'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => onPrintBill(bill)}
                                        className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                                        title="Print Bill"
                                    >
                                        <Printer className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => onDeleteBill(bill)}
                                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                                        title="Delete Bill"
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
    )
}
