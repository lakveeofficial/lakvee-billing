"use client"

import { useState } from 'react'
import { Link as LinkIcon } from 'lucide-react'

export default function CopyLinkButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      const url = `${window.location.origin}/dashboard/csv-invoices/${id}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <button
      title={copied ? 'Copied!' : 'Copy link'}
      onClick={copy}
      className={`p-2 rounded hover:bg-gray-50 text-gray-700 ${copied ? 'text-green-600' : ''}`}
    >
      <LinkIcon className="h-4 w-4" />
    </button>
  )
}
