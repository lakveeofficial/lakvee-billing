import { ensureCsvInvoicesTable, listCsvInvoices } from '@/lib/csvInvoices'
import { Eye, Pencil, FileSpreadsheet, Search } from 'lucide-react'
import DeleteRowButton from './DeleteRowButton'
import PrintPdfButton from './PrintPdfButton'
import PageHeader from '@/components/PageHeader'
import { db } from '@/lib/db'
// GeneratePartyInvoicesButton disabled per request
// import GeneratePartyInvoicesButton from './GeneratePartyInvoicesButton'
import ApplyRateButton from './ApplyRateButton'
import GlobalApplyRatesButton from './GlobalApplyRatesButton'
import GeneratePartyInvoiceButton from './GeneratePartyInvoiceButton'

export default async function CsvInvoicesPage({ searchParams }: { searchParams: { page?: string; limit?: string; q?: string; party?: string; view?: string } }) {
  await ensureCsvInvoicesTable()
  const limit = Math.max(1, Math.min(200, Number(searchParams?.limit || 25)))
  const page = Math.max(1, Number(searchParams?.page || 1))
  const q = (searchParams as any)?.q ? String((searchParams as any).q).toLowerCase() : ''
  const party = (searchParams as any)?.party ? String((searchParams as any).party).trim() : ''
  // Combined tab disabled; force staged view
  const view = 'staged'
  const offset = (page - 1) * limit
  const { rows, total } = view === 'staged' ? await listCsvInvoices(limit, offset) : { rows: [], total: 0 }

  // Load party options from DB
  const partyRes = await db.query(`SELECT party_name FROM parties WHERE party_name IS NOT NULL ORDER BY party_name`)
  const partyOptions: string[] = (partyRes.rows || []).map((r: any) => String(r.party_name))

  // Server-side filtering on fetched page (non-paginated filter). Shows filtered count.
  const searchable = ['sender_name','recipient_name','consignment_no','booking_reference','mode','service_type','customer','payment_mode']
  let filteredRows = q
    ? rows.filter((r: any) => searchable.some(k => String(r[k] ?? '').toLowerCase().includes(q)))
    : rows

  if (party) {
    const partyKey = party.toLowerCase()
    filteredRows = filteredRows.filter((r: any) => String(r.sender_name ?? '').trim().toLowerCase() === partyKey)
  }

  const headers = [
    'booking_date','booking_reference','consignment_no','mode','service_type','weight','prepaid_amount','final_collected','retail_price','sender_name','sender_phone','sender_address','recipient_name','recipient_phone','recipient_address','booking_mode','shipment_type','risk_surcharge_amount','risk_surcharge_type','contents','declared_value','eway_bill','gst_invoice','customer','service_code','region','payment_mode','chargeable_weight','payment_utr','employee_code','employee_discount_percent','employee_discount_amount','promocode','promocode_discount','packing_material','no_of_stretch_films','created_at'
  ]

  const inr = (n: any) => {
    const v = Number(n)
    if (!isFinite(v)) return ''
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)
  }

  const fmtDate = (d: any) => {
    if (!d) return ''
    try { return new Date(d).toLocaleDateString() } catch { return String(d) }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title="CSV Invoices"
        subtitle={q ? `Filtered ${filteredRows.length} of ${total}` : `Total ${total}`}
      />

      {/* Controls */}
      <form className="bg-white p-3 rounded-lg border flex flex-col gap-3 md:flex-row md:items-center md:justify-between" method="get">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-2 top-2.5" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search sender, recipient, consignment..."
              className="pl-8 pr-3 py-2 border rounded-lg w-64 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              name="party"
              defaultValue={party}
              className="px-2 py-2 border rounded-lg text-sm ml-2"
            >
              <option value="">All Parties</option>
              {partyOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Rows per page</label>
          <select name="limit" defaultValue={String(limit)} className="px-2 py-2 border rounded-lg text-sm">
            {[25,50,100,200].map(n => (<option key={n} value={n}>{n}</option>))}
          </select>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="view" value={view} />
          <button type="submit" className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Apply</button>
          {q || party ? (
            <a href={`?page=1&limit=${limit}&view=${view}`} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">Clear</a>
          ) : null}
          {/* Global apply slabs */}
          <GlobalApplyRatesButton
            ids={(filteredRows || []).map((r: any) => r.id)}
            labels={Object.fromEntries((filteredRows || []).map((r: any) => {
              const labelLeft = String(r.consignment_no || r.booking_reference || r.id)
              const labelRight = (() => { try { return new Date(r.booking_date).toLocaleDateString() } catch { return '' } })()
              return [String(r.id), labelRight ? `${labelLeft} • ${labelRight}` : labelLeft]
            }))}
            partyNames={Object.fromEntries((filteredRows || []).map((r: any) => [String(r.id), String(r.sender_name || '')]))}
          />
          <GeneratePartyInvoiceButton rows={(filteredRows || [])} defaultParty={party || undefined} />
          {/* GeneratePartyInvoicesButton disabled */}
        </div>
      </form>

      {/* Staged Table (Combined disabled) */}
      
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {headers.map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h === 'weight' ? 'WEIGHT (IN Kg)' : h.split('_').join(' ')}</th>
              ))}
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Slab Rate</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRows.map((row: any, idx: number) => (
              <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {headers.map(h => {
                  const val = row[h]
                  const commonCls = 'px-4 py-2 whitespace-nowrap text-gray-900'
                  const truncateCls = ['sender_address','recipient_address','contents'].includes(h) ? 'max-w-[240px] truncate' : ''
                  const content = h === 'booking_date' || h === 'created_at'
                    ? fmtDate(val)
                    : (h === 'final_collected' || h === 'retail_price')
                      ? inr(val)
                        : String(val ?? '')
                  return (
                    <td key={h} className={`${commonCls} ${truncateCls}`}>{content}</td>
                  )
                })}
                {(() => {
                  const meta: any = row?.pricing_meta || null
                  const base = meta?.rate_breakup?.base ?? meta?.base ?? meta?.rate_breakup?.baseRate ?? null
                  return (
                    <td className="px-4 py-2 whitespace-nowrap text-gray-900">{base != null ? inr(base) : ''}</td>
                  )
                })()}
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <a title="View" href={`/dashboard/csv-invoices/${row.id}`} className="p-2 rounded hover:bg-blue-50 text-blue-600"><Eye className="h-4 w-4" /></a>
                    <a title="Edit" href={`/dashboard/csv-invoices/${row.id}?edit=1`} className="p-2 rounded hover:bg-amber-50 text-amber-600"><Pencil className="h-4 w-4" /></a>
                    <a title="Download CSV" href={`/api/csv-invoices/${row.id}/csv`} className="p-2 rounded hover:bg-emerald-50 text-emerald-600"><FileSpreadsheet className="h-4 w-4" /></a>
                    <ApplyRateButton id={row.id} />
                    <PrintPdfButton invoiceId={row.id} />
                    <DeleteRowButton id={row.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="flex items-center justify-between p-3 border-t bg-white">
          <div className="text-sm text-gray-600">Page {page} of {Math.max(1, Math.ceil(total / limit))} {q && `(filtered ${filteredRows.length})`}</div>
          <div className="flex gap-2">
            <a
              href={`?page=${Math.max(1, page - 1)}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ''}${party ? `&party=${encodeURIComponent(party)}` : ''}`}
              className={`px-3 py-1 border rounded ${page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50'}`}
            >Prev</a>
            <a
              href={`?page=${page + 1}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ''}${party ? `&party=${encodeURIComponent(party)}` : ''}`}
              className={`px-3 py-1 border rounded ${page >= Math.ceil(total / limit) ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50'}`}
            >Next</a>
          </div>
        </div>
      </div>
    </div>
  )
 }
