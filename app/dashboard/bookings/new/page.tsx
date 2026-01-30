'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewBookingPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard')
  }, [router])
  return null
}
const __DEPRECATED__ = `

      {/* Step 2: Shipment Category & Service Details */}
      <div className="border rounded p-3 space-y-3">
        <div className="font-medium">Step 2: Shipment Category & Service Details</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Shipment Type</label>
            <select className="border rounded px-2 py-1" value={form.shipmentType} onChange={(e)=>setForm(f=>({...f, shipmentType: e.target.value as ShipmentType, weightSlabId: undefined}))}>
              <option value="DOCUMENT">Document</option>
              <option value="NON_DOCUMENT">Non-Document</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Mode</label>
            <select className="border rounded px-2 py-1" value={form.modeId ?? ""} onChange={(e)=>setForm(f=>({...f, modeId: e.target.value === "" ? undefined : Number(e.target.value), weightSlabId: undefined}))}>
              <option value="">Select</option>
              {modes.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Service Type</label>
            <select className="border rounded px-2 py-1" value={form.serviceTypeId ?? ""} onChange={(e)=>setForm(f=>({...f, serviceTypeId: e.target.value === "" ? undefined : Number(e.target.value), weightSlabId: undefined}))}>
              <option value="">Select</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Service Code</label>
            <input className="border rounded px-2 py-1" value={form.serviceCode} onChange={(e)=>setForm(f=>({...f, serviceCode: e.target.value}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Region</label>
            <select className="border rounded px-2 py-1" value={form.regionId ?? ""} onChange={(e)=>setForm(f=>({...f, regionId: e.target.value === "" ? undefined : Number(e.target.value), weightSlabId: undefined}))}>
              <option value="">Select</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Step 3: Weight Slab & Rate */}
      <div className="border rounded p-3 space-y-3">
        <div className="font-medium">Step 3: Weight Slab & Rate</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Weight Slab</label>
            <select className="border rounded px-2 py-1" value={form.weightSlabId ?? ""} onChange={(e)=>setForm(f=>({...f, weightSlabId: e.target.value === "" ? undefined : Number(e.target.value)}))}>
              <option value="">Select</option>
              {filteredWeightSlabs.map(ws => <option key={ws.id} value={ws.id}>{ws.slab_name}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Rate</label>
            <input type="number" step="0.01" className="border rounded px-2 py-1" value={form.rate}
              onChange={(e)=>setForm(f=>({...f, rate: Number(e.target.value || 0)}))}
              disabled={!canOverrideRate} />
            {!canOverrideRate && <span className="text-[11px] text-slate-500">Auto-filled from slab. No override permission.</span>}
          </div>
        </div>
      </div>

      {/* Step 4: Shipment & Pricing Details */}
      <div className="border rounded p-3 space-y-3">
        <div className="font-medium">Step 4: Shipment & Pricing Details</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Destination</label>
            <input className="border rounded px-2 py-1" value={form.destination} onChange={(e)=>setForm(f=>({...f, destination: e.target.value}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Weight (Kg)</label>
            <input type="number" step="0.01" className="border rounded px-2 py-1" value={form.weightKg ?? ""} onChange={(e)=>setForm(f=>({...f, weightKg: e.target.value === "" ? undefined : Number(e.target.value)}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Chargeable Weight (Kg)</label>
            <input type="number" step="0.01" className="border rounded px-2 py-1" value={form.chargeableWeight ?? ""} onChange={(e)=>setForm(f=>({...f, chargeableWeight: e.target.value === "" ? undefined : Number(e.target.value)}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Retail Price</label>
            <input className="border rounded px-2 py-1 bg-slate-50" value={retailPrice.toFixed(2)} readOnly />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Shipping Charges</label>
            <input type="number" step="0.01" className="border rounded px-2 py-1" value={form.shippingCharges} onChange={(e)=>setForm(f=>({...f, shippingCharges: Number(e.target.value || 0)}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Packaging Charges</label>
            <input type="number" step="0.01" className="border rounded px-2 py-1" value={form.packagingCharges} onChange={(e)=>setForm(f=>({...f, packagingCharges: Number(e.target.value || 0)}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Fuel Surcharge</label>
            <input type="number" step="0.01" className="border rounded px-2 py-1" value={form.fuelSurcharge} onChange={(e)=>setForm(f=>({...f, fuelSurcharge: Number(e.target.value || 0)}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Risk Type</label>
            <select className="border rounded px-2 py-1" value={form.riskType} onChange={(e)=>setForm(f=>({...f, riskType: e.target.value as RiskType}))}>
              <option value="NONE">None</option>
              <option value="PERCENT">Percent</option>
              <option value="FIXED">Fixed</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Risk Value</label>
            <input type="number" step="0.01" className="border rounded px-2 py-1" value={form.riskValue} onChange={(e)=>setForm(f=>({...f, riskValue: Number(e.target.value || 0)}))} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Employee Discount %</label>
            <input type="number" step="0.01" className="border rounded px-2 py-1" value={form.empDiscPct} onChange={(e)=>setForm(f=>({...f, empDiscPct: Number(e.target.value || 0)}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Employee Discount Amount</label>
            <input type="number" step="0.01" className="border rounded px-2 py-1" value={form.empDiscAmt} onChange={(e)=>setForm(f=>({...f, empDiscAmt: Number(e.target.value || 0)}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Promo Code</label>
            <input className="border rounded px-2 py-1" value={form.promoCode} onChange={(e)=>setForm(f=>({...f, promoCode: e.target.value}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Promo Discount Amount</label>
            <input type="number" step="0.01" className="border rounded px-2 py-1" value={form.promoDiscAmt} onChange={(e)=>setForm(f=>({...f, promoDiscAmt: Number(e.target.value || 0)}))} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Final Collected Amount</label>
            <input className="border rounded px-2 py-1 bg-slate-50" value={finalAmount.toFixed(2)} readOnly />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Prepaid Amount</label>
            <input type="number" step="0.01" className="border rounded px-2 py-1" />
          </div>
        </div>
      </div>

      {/* Step 5: Receiver Details */}
      <div className="border rounded p-3 space-y-3">
        <div className="font-medium">Step 5: Receiver Details</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Recipient Name</label>
            <input className="border rounded px-2 py-1" value={form.recipientName} onChange={(e)=>setForm(f=>({...f, recipientName: e.target.value}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Recipient Phone</label>
            <input className="border rounded px-2 py-1" value={form.recipientPhone} onChange={(e)=>setForm(f=>({...f, recipientPhone: e.target.value}))} />
          </div>
          <div className="md:col-span-3 flex flex-col">
            <label className="text-xs text-slate-600">Recipient Address</label>
            <textarea className="border rounded px-2 py-1" value={form.recipientAddress} onChange={(e)=>setForm(f=>({...f, recipientAddress: e.target.value}))} />
          </div>
        </div>
      </div>

      {/* Other Shipment Information */}
      <div className="border rounded p-3 space-y-3">
        <div className="font-medium">Other Shipment Information</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Mode of Booking</label>
            <select className="border rounded px-2 py-1" value={form.bookingMode} onChange={(e)=>setForm(f=>({...f, bookingMode: e.target.value}))}>
              {['Counter','Online','Pickup'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 flex flex-col">
            <label className="text-xs text-slate-600">Contents</label>
            <textarea className="border rounded px-2 py-1" value={form.contents} onChange={(e)=>setForm(f=>({...f, contents: e.target.value}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Declared Value</label>
            <input type="number" step="0.01" className="border rounded px-2 py-1" value={form.declaredValue ?? ""} onChange={(e)=>setForm(f=>({...f, declaredValue: e.target.value === "" ? undefined : Number(e.target.value)}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">E-Way Bill</label>
            <input className="border rounded px-2 py-1" value={form.ewayBill} onChange={(e)=>setForm(f=>({...f, ewayBill: e.target.value}))} />
          </div>
          <div className="flex items-center gap-2">
            <input id="gst_invoice" type="checkbox" checked={form.gstInvoice} onChange={(e)=>setForm(f=>({...f, gstInvoice: e.target.checked}))} />
            <label htmlFor="gst_invoice" className="text-sm">GST Invoice</label>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="border rounded p-3 space-y-3">
        <div className="font-medium">Payment Details</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Payment Mode</label>
            <select className="border rounded px-2 py-1" value={form.paymentMode} onChange={(e)=>setForm(f=>({...f, paymentMode: e.target.value}))}>
              {['Cash','UPI','Card','Bank'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Payment UTR (if applicable)</label>
            <input className="border rounded px-2 py-1" value={form.paymentUtr} onChange={(e)=>setForm(f=>({...f, paymentUtr: e.target.value}))} />
          </div>
        </div>
      </div>

      {/* Staff & Tracking */}
      <div className="border rounded p-3 space-y-3">
        <div className="font-medium">Staff & Tracking Details</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Employee Code</label>
            <input className="border rounded px-2 py-1" value={form.employeeCode} onChange={(e)=>setForm(f=>({...f, employeeCode: e.target.value}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Packing Material Used</label>
            <input className="border rounded px-2 py-1" value={form.packingMaterial} onChange={(e)=>setForm(f=>({...f, packingMaterial: e.target.value}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">No. of Stretch Films Used</label>
            <input type="number" className="border rounded px-2 py-1" value={form.stretchFilmsUsed ?? 0} onChange={(e)=>setForm(f=>({...f, stretchFilmsUsed: Number(e.target.value || 0)}))} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button className="px-3 py-2 rounded border" onClick={()=>setForm(f=>({...f, bookingRef: genRef(), consignmentNo: genConsignment()}))}>Regenerate IDs</button>
        <button className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50" disabled={!requiredOk || loading} onClick={onSave}>
          {loading ? "Saving..." : "Save Booking"}
        </button>
      </div>
    </div>
  )
}
`;
