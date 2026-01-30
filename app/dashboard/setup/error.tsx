'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    // You can log the error to an error reporting service here
    // console.error('Setup page error:', error)
  }, [error])

  return (
    <div className="p-6 min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white border border-red-200 rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-red-100 text-red-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
            <p className="mt-1 text-sm text-slate-600">The Setup page failed to load. You can try refreshing.</p>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-3 bg-slate-50 text-xs text-slate-700 p-3 rounded overflow-auto max-h-40">{String(error?.message || 'Unknown error')}</pre>
            )}
            <button
              onClick={() => reset()}
              className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
