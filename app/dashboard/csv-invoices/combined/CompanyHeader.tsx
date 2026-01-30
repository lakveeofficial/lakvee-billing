import { getAnyActiveCompany } from '@/lib/company'

export default async function CompanyHeader() {
  const c = await getAnyActiveCompany()

  const name = c?.business_name || 'Company'
  const address1 = c?.business_address || ''
  const state = c?.state || ''
  const pin = c?.pincode || ''
  const phone = c?.phone_number || ''
  const email = c?.email_id || ''
  const gstin = c?.gstin || ''
  const logo = c?.logo || ''

  const hasAnyText = Boolean(name || address1 || state || pin || phone || email || gstin)

  return (
    <div className="flex items-center justify-between border-b pb-3">
      <div className="flex items-center gap-4">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt="Company Logo"
            style={{ height: 56, maxWidth: 200, objectFit: 'contain' }}
          />
        ) : null}
        {hasAnyText ? (
          <div>
            <div className="text-xl font-bold">{name}</div>
            <div className="text-xs text-slate-600">
              {address1 ? <div>{address1}</div> : null}
              {(state || pin) ? (
                <div>{[state, pin].filter(Boolean).join(', ')}</div>
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
