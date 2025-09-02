import Link from 'next/link'
import WeightSlabsManager from '@/app/dashboard/rates/components/WeightSlabsManager'

export default function MastersPage() {
  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Rate Masters</h1>
        <Link href="/dashboard/rates/party" className="text-blue-600 hover:underline">
          Go to Party Rate Slabs →
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Weight Slabs</h2>
        <p className="text-sm text-gray-500">Manage global weight slabs used for rate resolution.</p>
        <WeightSlabsManager />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Other Masters</h2>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Modes (DOCUMENT, NON_DOCUMENT) – seeded. API: <code>/api/slabs/modes</code></li>
          <li>
            Service Types (AIR_CARGO, B2C_PRIORITY, B2C_SMART_EXPRESS, EXPRESS, GROUND_EXPRESS, PREMIUM, STD_EXP_A, STD_EXP_S, SURFACE_EXPRESS)
            – seeded. API: <code>/api/slabs/service-types</code>
          </li>
          <li>Distance Slabs (METRO CITIES, WITHIN STATE, OUT OF STATE, OTHER STATE) – seeded. API: <code>/api/slabs/distance</code></li>
        </ul>
        <p className="text-xs text-gray-400">Editable UIs for these can be added similarly to Weight Slabs.</p>
      </section>
    </div>
  )
}
