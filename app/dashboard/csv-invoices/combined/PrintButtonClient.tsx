'use client'

export default function PrintButtonClient() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-3 py-2 rounded bg-blue-600 text-white text-sm"
    >
      Print
    </button>
  )
}
