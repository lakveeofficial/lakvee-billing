'use client'

import { useEffect, useState } from 'react'

interface Row {
  date: string
  invoice_number: string
  client: string
  consignment_no: string
  package_type: string
  courier: string
  weight: number
  amount: number
}

export default function DailyCollectionPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [dateFrom, setDateFrom] = useState<string>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10))
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [partyId, setPartyId] = useState('')
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [parties, setParties] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])

  useEffect(() => {
    const loadFilters = async () => {
      const [p, s] = await Promise.all([
        fetch('/api/parties?limit=100&page=1').then(r => r.json()),
        fetch('/api/slabs/service-types').then(r => r.json()).catch(() => ({ data: [] }))
      ])
      setParties(p.data || [])
      setServices(s.data || [])
    }
    loadFilters()
  }, [])

  async function load() {
    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo })
    if (partyId) params.set('party_id', partyId)
    if (serviceTypeId) params.set('service_type_id', serviceTypeId)
    const res = await fetch(`/api/reports/daily-collection?${params}`)
    const json = await res.json()
    setRows(json.data || [])
  }

  useEffect(() => { load() }, [])

  function toCSV() {
    const headers = ['Date','Invoice #','Client','Consignment #','Package Type','Courier','Weight (kg)','Amount']
    const esc = (v: any) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const data = rows.map(r => [r.date, r.invoice_number, r.client, r.consignment_no, r.package_type, r.courier, r.weight, r.amount])
    const csv = [headers, ...data].map(a => a.map(esc).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily_collection_${dateFrom}_${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Daily Collection</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-sm text-slate-600">From</label>
          <input type="date" className="border rounded px-3 py-2 w-full" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-slate-600">To</label>
          <input type="date" className="border rounded px-3 py-2 w-full" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-slate-600">Client</label>
          <select className="border rounded px-3 py-2 w-full" value={partyId} onChange={e => setPartyId(e.target.value)}>
            <option value="">All</option>
            {parties.map((p: any) => <option key={p.id} value={p.id}>{p.party_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600">Courier</label>
          <select className="border rounded px-3 py-2 w-full" value={serviceTypeId} onChange={e => setServiceTypeId(e.target.value)}>
            <option value="">All</option>
            {services.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
        <button className="bg-primary-600 text-white px-4 py-2 rounded" onClick={load}>Apply</button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-3">Date</th>
              <th className="p-3">Invoice #</th>
              <th className="p-3">Client</th>
              <th className="p-3">Consignment</th>
              <th className="p-3">Package</th>
              <th className="p-3">Courier</th>
              <th className="p-3">Weight (kg)</th>
              <th className="p-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">{r.date}</td>
                <td className="p-3">{r.invoice_number}</td>
                <td className="p-3">{r.client}</td>
                <td className="p-3">{r.consignment_no}</td>
                <td className="p-3">{r.package_type}</td>
                <td className="p-3">{r.courier}</td>
                <td className="p-3">{r.weight}</td>
                <td className="p-3">{r.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button className="px-4 py-2 rounded border" onClick={toCSV}>Export CSV</button>
        <button className="px-4 py-2 rounded border" onClick={() => window.print()}>Print</button>
      </div>
    </div>
  )
}
