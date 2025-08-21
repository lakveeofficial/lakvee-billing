import { ensureCsvInvoicesTable, getCsvInvoiceById } from '@/lib/csvInvoices'
import { notFound } from 'next/navigation'
import DeleteButton from './DeleteButton'
import EditCsvInvoiceForm from './EditCsvInvoiceForm'
import PdfTemplatePicker from './PdfTemplatePicker'
import PageHeader from '@/components/PageHeader'

export default async function CsvInvoiceDetail({ params, searchParams }: { params: { id: string }, searchParams?: { [key: string]: string | string[] | undefined } }) {
  await ensureCsvInvoicesTable()
  const row = await getCsvInvoiceById(params.id)
  if (!row) return notFound()

  const entries = Object.entries(row)
  const isEdit = String(searchParams?.edit ?? '').toLowerCase() === '1'

  return (
    <div className="space-y-6">
      <PageHeader
        title="CSV Invoice Detail"
        subtitle={`Record ID: ${row.id}`}
        actions={(
          <div className="flex items-center gap-2">
            <a href={`/api/csv-invoices/${row.id}/csv`} className="px-3 py-2 text-sm rounded-lg border border-white/30 bg-white/10 hover:bg-white/20 text-white">Download CSV</a>
            <a href={`/api/csv-invoices/${row.id}/pdf?template=courier_aryan`} className="px-3 py-2 text-sm rounded-lg border border-white/30 bg-white/10 hover:bg-white/20 text-white">Download PDF</a>
            <div className="hidden md:block"><PdfTemplatePicker id={row.id} /></div>
            <div className="hidden md:block"><DeleteButton id={row.id} /></div>
            <a href="/dashboard/csv-invoices" className="px-3 py-2 text-sm rounded-lg border border-white/30 bg-white/10 hover:bg-white/20 text-white">Back to list</a>
          </div>
        )}
      />

      <div className="bg-white p-6 rounded-lg border overflow-x-auto">
        {isEdit ? (
          <EditCsvInvoiceForm initial={row as any} />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map(([k, v]) => (
                <tr key={k}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{k.split('_').join(' ')}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{String(v ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
