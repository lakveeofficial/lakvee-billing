'use client'

import { useEffect, useState } from 'react'

type Company = {
  id?: number | string
  // DB keys
  business_name?: string
  phone_number?: string | null
  email_id?: string | null
  business_address?: string | null
  state?: string | null
  pincode?: string | null
  gstin?: string | null
  logo?: string | null
  // Possible alternative keys
  name?: string
  phone?: string
  email?: string
  address?: string
  city?: string
}

export default function CompanyHeaderClient() {
  const [company, setCompany] = useState<Company | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/company/active', { cache: 'no-store' })
        if (r.ok) {
          const data = await r.json()
          const unwrapped = (data && (data.data || data.company)) || data
          setCompany(unwrapped || null)
        }
      } catch {}
    })()
  }, [])

  // Normalize fields from various shapes
  const name = company?.business_name || company?.name || ''
  const phone = company?.phone_number || company?.phone || ''
  const email = company?.email_id || company?.email || ''
  const address1 = company?.business_address || company?.address || ''
  const city = company?.city || ''
  const state = company?.state || ''
  const pin = company?.pincode || ''
  const gstin = company?.gstin || ''

  const hasAnyText = Boolean(name || phone || email || address1 || city || state || pin || gstin)

  return (
    <div className="flex items-center justify-between border-b pb-3">
      <div className="flex items-center gap-4">
        {company?.logo ? (
          <img
            src={company.logo}
            alt="Company Logo"
            style={{ height: 56, maxWidth: 200, objectFit: 'contain' }}
          />
        ) : null}
        {hasAnyText ? (
          <div>
            <div className="text-xl font-bold">{name || 'Company'}</div>
            <div className="text-xs text-gray-600">
              {address1 ? <div>{address1}</div> : null}
              {(city || state || pin) ? (
                <div>{[city, state, pin].filter(Boolean).join(', ')}</div>
              ) : null}
              {(phone || email) ? (
                <div className="flex gap-4">
                  {phone ? <span>Phone: {phone}</span> : null}
                  {email ? <span>Email: {email}</span> : null}
                </div>
              ) : null}
              {gstin ? <div>GSTIN: {gstin}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
      <div className="text-xl font-extrabold tracking-wide">Tax Invoice</div>
    </div>
  )
}
