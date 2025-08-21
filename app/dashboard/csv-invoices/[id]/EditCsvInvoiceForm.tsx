"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

export type CsvInvoiceEditable = {
  id: string
  booking_date: string | null
  booking_reference: string | null
  consignment_no: string | null
  mode: string | null
  service_type: string | null
  weight: number | null
  prepaid_amount: number | null
  final_collected: number | null
  retail_price: number | null
  sender_name: string | null
  sender_phone: string | null
  sender_address: string | null
  recipient_name: string | null
  recipient_phone: string | null
  recipient_address: string | null
  booking_mode: string | null
  shipment_type: string | null
  risk_surcharge_amount: number | null
  risk_surcharge_type: string | null
  contents: string | null
  declared_value: number | null
  eway_bill: string | null
  gst_invoice: string | null
  customer: string | null
  service_code: string | null
  region: string | null
  payment_mode: string | null
  chargeable_weight: number | null
  payment_utr: string | null
  employee_code: string | null
  employee_discount_percent: number | null
  employee_discount_amount: number | null
  promocode: string | null
  promocode_discount: number | null
  packing_material: string | null
  no_of_stretch_films: number | null
}

function toStr(v: any) { return v === null || v === undefined ? '' : String(v) }
function toMaybeNumber(v: string) {
  if (v === '' || v === undefined || v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export default function EditCsvInvoiceForm({ initial }: { initial: CsvInvoiceEditable }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState(() => ({ ...initial }))
  const [saving, setSaving] = useState(false)

  const onChange = (k: keyof CsvInvoiceEditable) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.currentTarget.value
    const numericKeys: (keyof CsvInvoiceEditable)[] = [
      'weight','prepaid_amount','final_collected','retail_price','risk_surcharge_amount','declared_value','chargeable_weight','employee_discount_percent','employee_discount_amount','promocode_discount','no_of_stretch_films'
    ]
    setForm(prev => ({
      ...prev,
      [k]: numericKeys.includes(k) ? toMaybeNumber(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const patch: Partial<CsvInvoiceEditable> = {}
      Object.keys(form).forEach((k) => {
        const key = k as keyof CsvInvoiceEditable
        if (key === 'id') return
        // Only send changed values
        if ((form as any)[key] !== (initial as any)[key]) {
          (patch as any)[key] = (form as any)[key]
        }
      })
      const res = await fetch(`/api/csv-invoices/${initial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      })
      if (!res.ok) throw new Error('Save failed')
      const url = new URL(window.location.href)
      url.searchParams.delete('edit')
      router.replace(url.toString())
      router.refresh()
    } catch (err) {
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const group = (title: string, children: React.ReactNode) => (
    <fieldset className="border rounded p-4 space-y-3">
      <legend className="px-1 text-sm font-medium text-gray-700">{title}</legend>
      {children}
    </fieldset>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {group('Dates / References', (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Booking Date</label>
            <input type="date" value={toStr(form.booking_date)} onChange={onChange('booking_date')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Booking Reference</label>
            <input type="text" value={toStr(form.booking_reference)} onChange={onChange('booking_reference')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Consignment No</label>
            <input type="text" value={toStr(form.consignment_no)} onChange={onChange('consignment_no')} className="w-full px-3 py-2 border rounded" />
          </div>
        </div>
      ))}

      {group('Mode / Service', (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Mode</label>
            <input type="text" value={toStr(form.mode)} onChange={onChange('mode')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Service Type</label>
            <input type="text" value={toStr(form.service_type)} onChange={onChange('service_type')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Booking Mode</label>
            <input type="text" value={toStr(form.booking_mode)} onChange={onChange('booking_mode')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Shipment Type</label>
            <input type="text" value={toStr(form.shipment_type)} onChange={onChange('shipment_type')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Service Code</label>
            <input type="text" value={toStr(form.service_code)} onChange={onChange('service_code')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Region</label>
            <input type="text" value={toStr(form.region)} onChange={onChange('region')} className="w-full px-3 py-2 border rounded" />
          </div>
        </div>
      ))}

      {group('Sender / Recipient', (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Sender Name</label>
            <input type="text" value={toStr(form.sender_name)} onChange={onChange('sender_name')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Sender Phone</label>
            <input type="text" value={toStr(form.sender_phone)} onChange={onChange('sender_phone')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div className="md:col-span-1">
            <label className="text-sm text-gray-600">Sender Address</label>
            <input type="text" value={toStr(form.sender_address)} onChange={onChange('sender_address')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Recipient Name</label>
            <input type="text" value={toStr(form.recipient_name)} onChange={onChange('recipient_name')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Recipient Phone</label>
            <input type="text" value={toStr(form.recipient_phone)} onChange={onChange('recipient_phone')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div className="md:col-span-1">
            <label className="text-sm text-gray-600">Recipient Address</label>
            <input type="text" value={toStr(form.recipient_address)} onChange={onChange('recipient_address')} className="w-full px-3 py-2 border rounded" />
          </div>
        </div>
      ))}

      {group('Amounts / Weights', (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Weight (kg)</label>
            <input type="number" step="0.01" value={toStr(form.weight)} onChange={onChange('weight')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Chargeable Weight</label>
            <input type="number" step="0.01" value={toStr(form.chargeable_weight)} onChange={onChange('chargeable_weight')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Prepaid Amount</label>
            <input type="number" step="0.01" value={toStr(form.prepaid_amount)} onChange={onChange('prepaid_amount')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Final Collected</label>
            <input type="number" step="0.01" value={toStr(form.final_collected)} onChange={onChange('final_collected')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Retail Price</label>
            <input type="number" step="0.01" value={toStr(form.retail_price)} onChange={onChange('retail_price')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Risk Surcharge Amount</label>
            <input type="number" step="0.01" value={toStr(form.risk_surcharge_amount)} onChange={onChange('risk_surcharge_amount')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Declared Value</label>
            <input type="number" step="0.01" value={toStr(form.declared_value)} onChange={onChange('declared_value')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Employee Disc %</label>
            <input type="number" step="0.01" value={toStr(form.employee_discount_percent)} onChange={onChange('employee_discount_percent')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Employee Disc Amt</label>
            <input type="number" step="0.01" value={toStr(form.employee_discount_amount)} onChange={onChange('employee_discount_amount')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Promo Discount</label>
            <input type="number" step="0.01" value={toStr(form.promocode_discount)} onChange={onChange('promocode_discount')} className="w-full px-3 py-2 border rounded" />
          </div>
        </div>
      ))}

      {group('Other', (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Risk Surcharge Type</label>
            <input type="text" value={toStr(form.risk_surcharge_type)} onChange={onChange('risk_surcharge_type')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Contents</label>
            <input type="text" value={toStr(form.contents)} onChange={onChange('contents')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Eway Bill</label>
            <input type="text" value={toStr(form.eway_bill)} onChange={onChange('eway_bill')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">GST Invoice</label>
            <input type="text" value={toStr(form.gst_invoice)} onChange={onChange('gst_invoice')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Customer</label>
            <input type="text" value={toStr(form.customer)} onChange={onChange('customer')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Payment Mode</label>
            <input type="text" value={toStr(form.payment_mode)} onChange={onChange('payment_mode')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Payment UTR</label>
            <input type="text" value={toStr(form.payment_utr)} onChange={onChange('payment_utr')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Employee Code</label>
            <input type="text" value={toStr(form.employee_code)} onChange={onChange('employee_code')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Promocode</label>
            <input type="text" value={toStr(form.promocode)} onChange={onChange('promocode')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Packing Material</label>
            <input type="text" value={toStr(form.packing_material)} onChange={onChange('packing_material')} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">No. of Stretch Films</label>
            <input type="number" step="1" value={toStr(form.no_of_stretch_films)} onChange={onChange('no_of_stretch_films')} className="w-full px-3 py-2 border rounded" />
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button type="button" onClick={() => { const url = new URL(window.location.href); url.searchParams.delete('edit'); history.replaceState(null, '', url.toString()); router.refresh() }} className="px-4 py-2 border rounded hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  )
}
