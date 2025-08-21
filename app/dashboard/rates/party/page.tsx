"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PartyRateSlabsManager from '@/app/dashboard/rates/components/PartyRateSlabsManager'

export default function PartyRatesPage() {
  const searchParams = useSearchParams()
  const [partyName, setPartyName] = useState<string | null>(null)
  const partyIdParam = searchParams?.get('partyId')
  const partyId = useMemo(() => {
    const n = Number(partyIdParam)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }, [partyIdParam])

  useEffect(() => {
    let ignore = false
    async function fetchParty() {
      if (!partyId) { setPartyName(null); return }
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const res = await fetch(`/api/parties/${partyId}`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (!res.ok) { setPartyName(null); return }
        const row = await res.json()
        if (!ignore) setPartyName(row.party_name || row.partyName || null)
      } catch {
        if (!ignore) setPartyName(null)
      }
    }
    fetchParty()
    return () => { ignore = true }
  }, [partyId])

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Party Rate Slabs{partyId ? (
            <span className="ml-2 text-gray-600 text-base">{partyName ? `— ${partyName} (ID: ${partyId})` : `(Party ID: ${partyId})`}</span>
          ) : null}
        </h1>
        <Link href="/dashboard/rates/masters" className="text-blue-600 hover:underline">
          ← Back to Masters
        </Link>
      </div>
      <p className="text-sm text-gray-600">
        Configure party-specific rates per shipment type, mode, service type, distance slab, and weight slab. View audit logs for every change.
      </p>
      <PartyRateSlabsManager partyId={partyId} />
    </div>
  )
}
