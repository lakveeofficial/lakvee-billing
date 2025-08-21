import { db } from '@/lib/db'
import PageHeader from '@/components/PageHeader'
import PrintButtonClient from '../PrintButtonClient'
import CompanyHeader from '../CompanyHeader'

function inr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0)
}

function fmtDate(d: any) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-IN') } catch { return String(d) }
}

export default async function CombinedInvoicePrintPage({ params }: { params: { id: string } }) {
  const id = params.id
  const invRes = await db.query(`
    SELECT i.*, p.party_name, p.gst_number AS gstin, p.phone as party_phone
    FROM invoices i
    JOIN parties p ON p.id = i.party_id
    WHERE i.id = $1
  `, [id])
  const invoice = invRes.rows?.[0]
  if (!invoice) {
    return (
      <div className="p-6">
        <PageHeader title="Invoice Not Found" subtitle="The combined invoice does not exist" />
      </div>
    )
  }

  const itemsRes = await db.query(`SELECT item_description, quantity, unit_price, total_price, booking_date FROM invoice_items WHERE invoice_id = $1 ORDER BY booking_date NULLS LAST, item_description`, [id])
  const items = itemsRes.rows || []

  const subtotal = Number(invoice.subtotal) || items.reduce((s: number, r: any) => s + Number(r.total_price || 0), 0)
  const tax = Number(invoice.tax_amount) || 0
  const total = Number(invoice.total_amount) || (subtotal + tax + Number(invoice.additional_charges || 0))
  const received = Number(invoice.received_amount) || 0
  const balance = total - received

  return (
    <div className="p-6 space-y-4">
      <div className="print:hidden space-y-3">
        <PageHeader title={`Invoice ${invoice.invoice_number}`} subtitle={invoice.party_name} />
        <div className="flex justify-end">
          <PrintButtonClient />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow print:shadow-none print:rounded-none">
        {/* Company Header */}
        <div className="p-6">
          {/* Server-rendered company details for reliability */}
          <CompanyHeader />
        </div>
        {/* Party + Invoice meta */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-lg font-extrabold">{invoice.party_name}</div>
              <div className="text-sm text-gray-700 mt-1">Phone: {invoice.party_phone || '-'}</div>
              {invoice.gstin ? (<div className="text-sm text-gray-700">GSTIN: {invoice.gstin}</div>) : null}
            </div>
            <div className="text-sm text-gray-700 md:text-right">
              <div><span className="font-semibold">Invoice No:</span> {invoice.invoice_number}</div>
              <div><span className="font-semibold">Date:</span> {fmtDate(invoice.invoice_date)}</div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-2 py-2">S.NO.</th>
                <th className="text-left px-2 py-2">ITEM</th>
                <th className="text-left px-2 py-2">BOOKING DATE</th>
                <th className="text-left px-2 py-2">DESTINATION</th>
                <th className="text-left px-2 py-2">WEIGHT</th>
                <th className="text-right px-2 py-2">Amount(Rs)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any, idx: number) => (
                <tr key={`${idx}-${it.item_description}`} className="border-b">
                  <td className="px-2 py-2">{idx + 1}</td>
                  <td className="px-2 py-2">{it.item_description}</td>
                  <td className="px-2 py-2">{fmtDate(it.booking_date)}</td>
                  <td className="px-2 py-2">-</td>
                  <td className="px-2 py-2">-</td>
                  <td className="px-2 py-2 text-right">{inr(Number(it.total_price || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Block */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-t">
          <div>
            <div className="text-sm font-semibold mb-1">Payment Mode:</div>
            <div className="text-sm">Credit</div>
          </div>
          <div className="text-sm">
            <div className="flex justify-between py-1"><span>Sub Total</span><span>{inr(subtotal)}</span></div>
            <div className="flex justify-between py-1"><span>GST</span><span>{inr(tax)}</span></div>
            <div className="flex justify-between py-1 font-bold"><span>Total</span><span>{inr(total)}</span></div>
            <div className="flex justify-between py-1"><span>Received</span><span>{inr(received)}</span></div>
            <div className="flex justify-between py-1"><span>Balance</span><span>{inr(balance)}</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t text-xs text-gray-700">
          <div className="font-semibold mb-1">Terms & Conditions:</div>
          <div>Thanks for doing business with us!</div>
          <div className="mt-6 text-right">Authorized Signatory</div>
        </div>
      </div>
    </div>
  )
}
