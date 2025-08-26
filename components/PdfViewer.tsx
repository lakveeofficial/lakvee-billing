"use client"

import { useState, useRef, useEffect } from 'react'
import { Download, Eye, X, Loader2, AlertCircle } from 'lucide-react'
import { pdfCache } from '@/lib/pdfCache'

interface PdfViewerProps {
  pdfUrl: string
  filename?: string
  onClose: () => void
  isOpen: boolean
}

export default function PdfViewer({ pdfUrl, filename, onClose, isOpen }: PdfViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!isOpen || !pdfUrl) return

    const fetchPdf = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Check cache first
        let blob = pdfCache.get(pdfUrl)
        
        if (!blob) {
          const response = await fetch(pdfUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/pdf',
            }
          })

          if (!response.ok) {
            throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`)
          }

          blob = await response.blob()
          // Cache the PDF for future use
          pdfCache.set(pdfUrl, blob)
        }

        const url = URL.createObjectURL(blob)
        setBlobUrl(url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF')
      } finally {
        setLoading(false)
      }
    }

    fetchPdf()

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [isOpen, pdfUrl])

  const handleDownload = async () => {
    if (!blobUrl) return

    try {
      const response = await fetch(blobUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'document.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {filename || 'PDF Viewer'}
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            {blobUrl && (
              <>
                <button
                  onClick={handleOpenInNewTab}
                  className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  title="Open in new tab"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  New Tab
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {blobUrl && !loading && !error && (
            <iframe
              ref={iframeRef}
              src={blobUrl}
              className="w-full h-full border-0"
              title="PDF Viewer"
              onLoad={() => setLoading(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
