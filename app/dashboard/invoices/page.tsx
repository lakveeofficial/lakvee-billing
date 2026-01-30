'use client'

import PageHeader from '@/components/PageHeader'

export default function InvoicesPage() {
    return (
        <div className="p-6 bg-slate-50 min-h-screen space-y-6">
            <PageHeader
                title="Invoices"
                subtitle="View and manage generated GST invoices"
            />

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Invoices Module</h3>
                <p className="text-slate-500 max-w-sm">
                    This feature is currently under development. You will be able to view and manage all generated invoices here soon.
                </p>
            </div>
        </div>
    )
}
