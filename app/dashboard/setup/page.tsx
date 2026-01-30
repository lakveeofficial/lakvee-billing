'use client'

import { useEffect, useState } from 'react'
import { Settings, Box, Mail, Users, Server, Database, CloudDownload, Map, Building2 } from 'lucide-react'
import PackageTypesModal from '@/components/PackageTypesModal'
import DefaultQuotationModal from '@/components/DefaultQuotationModal'
import { PackageTypesProvider } from '@/components/SharedPackageTypesContext'

export default function SetupPage() {
  const [counts, setCounts] = useState({ regions: 0, centers: 0, carriers: 0, smsFormats: 0, operators: 0 })
  const [loading, setLoading] = useState(true)
  const [showPackageTypesModal, setShowPackageTypesModal] = useState(false)
  const [showDefaultQuotationModal, setShowDefaultQuotationModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/kpis', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setCounts({
            regions: Number(data.regions ?? data.regionsCount ?? 0),
            centers: Number(data.centers ?? data.centersCount ?? 0),
            carriers: Number(data.carriers ?? data.carriersCount ?? 0),
            smsFormats: Number(data.smsFormats ?? data.smsFormatsCount ?? 0),
            operators: Number(data.operators ?? data.operatorsCount ?? 0),
          })
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const Card = ({ title, value, href, icon: Icon, color, onClick }: any) => {
    const Component = onClick ? 'button' : 'a'
    return (
      <Component 
        {...(onClick ? { onClick } : { href })}
        className={`flex items-center justify-between p-4 rounded-xl shadow hover:shadow-lg transition bg-white border border-gray-100 w-full text-left`}
      >
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-semibold mt-1">{loading ? '—' : value}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="text-white" />
        </div>
      </Component>
    )
  }

  return (
    <PackageTypesProvider>
      <div className="p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Settings />
        <h1 className="text-2xl font-semibold">Setup & Configuration</h1>
      </div>

      {/* Misc */}
      <section>
        <h2 className="text-lg font-medium mb-3">Misc</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card title="Centers" value={counts.centers} href="/dashboard/setup/centers" icon={Building2} color="bg-indigo-500" />
          <Card title="Carriers" value={counts.carriers} href="/dashboard/setup/carriers" icon={Server} color="bg-emerald-500" />
          <Card title="Regions" value={counts.regions} href="/dashboard/setup/regions" icon={Map} color="bg-blue-500" />
          <Card title="SMS Formats" value={counts.smsFormats} href="/dashboard/setup/sms-formats" icon={Mail} color="bg-purple-500" />
          <Card title="Receivers" value={''} href="/dashboard/setup/receivers" icon={Users} color="bg-slate-600" />
        </div>
      </section>

      {/* Default Quotations */}
      <section>
        <h2 className="text-lg font-medium mb-3">Default Quotations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card title="Package Types" value={2} onClick={() => setShowPackageTypesModal(true)} icon={Box} color="bg-teal-500" />
          <Card title="Quotation (Region-wise)" value={''} onClick={() => setShowDefaultQuotationModal(true)} icon={Settings} color="bg-rose-500" />
          <Card title="More info" value={''} href="#" icon={Database} color="bg-amber-500" />
        </div>
      </section>

      {/* Send Email Quotations */}
      <section>
        <h2 className="text-lg font-medium mb-3">Send Email Quotations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card title="Package Types" value={2} onClick={() => setShowPackageTypesModal(true)} icon={Box} color="bg-teal-500" />
          <Card title="Quotation" value={''} href="/dashboard/setup/quotations/defaults" icon={Mail} color="bg-blue-500" />
          <Card title="Quotation Notes" value={''} href="/dashboard/setup/quotations/notes" icon={Users} color="bg-slate-500" />
        </div>
      </section>

      {/* Operators */}
      <section>
        <h2 className="text-lg font-medium mb-3">Operators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card title="Operators" value={counts.operators} href="/dashboard/setup/operators" icon={Users} color="bg-cyan-600" />
          <Card title="Bill Item Preferences" value={''} href="/dashboard/setup/operators/preferences" icon={Settings} color="bg-zinc-600" />
          <Card title="Bill Templates" value={''} href="/dashboard/setup/operators/templates" icon={Server} color="bg-orange-600" />
        </div>
      </section>

      {/* Account */}
      <section>
        <h2 className="text-lg font-medium mb-3">Account</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card title="Details" value={''} href="/dashboard/companies" icon={Database} color="bg-indigo-600" />
          <Card title="Backup" value={''} href="/api/backup" icon={CloudDownload} color="bg-emerald-600" />
          <Card title="Special Settings Items" value={''} href="/dashboard/setup/special-settings" icon={Settings} color="bg-rose-600" />
          <Card title="Daily Collection" value={''} href="/dashboard/reports/daily-collection" icon={Settings} color="bg-amber-600" />
        </div>
      </section>

      {/* Package Types Modal */}
      <PackageTypesModal 
        isOpen={showPackageTypesModal}
        onClose={() => setShowPackageTypesModal(false)}
      />

      {/* Default Quotation Modal */}
      <DefaultQuotationModal 
        isOpen={showDefaultQuotationModal}
        onClose={() => setShowDefaultQuotationModal(false)}
      />
      </div>
    </PackageTypesProvider>
  )
}
