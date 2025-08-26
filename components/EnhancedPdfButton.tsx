"use client"

import { useState } from 'react'
import { Printer, Download, Eye, Loader2, ChevronDown } from 'lucide-react'
import PdfViewer from './PdfViewer'
import TemplateSelectionModal from './TemplateSelectionModal'
import { pdfCache } from '@/lib/pdfCache'

interface EnhancedPdfButtonProps {
  id: string
  apiPath: string // e.g., '/api/csv-invoices' or '/api/invoices'
  filename?: string
  showTemplateSelector?: boolean
  variant?: 'button' | 'dropdown' | 'icon'
  className?: string
}

export default function EnhancedPdfButton({ 
  id, 
  apiPath, 
  filename,
  showTemplateSelector = true,
  variant = 'button',
  className = ''
}: EnhancedPdfButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showViewer, setShowViewer] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null)

  const generatePdfUrl = (templateId?: string) => {
    const template = templateId || 'courier_aryan'
    return `${apiPath}/${id}/pdf?template=${encodeURIComponent(template)}`
  }

  const handleDirectDownload = async (templateId?: string) => {
    setLoading(true)
    try {
      const url = generatePdfUrl(templateId)
      
      // Check cache first
      let blob = pdfCache.get(url)
      
      if (!blob) {
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Accept': 'application/pdf' }
        })

        // Check for redirect to login or HTML response
        const ct = response.headers.get('content-type') || ''
        if (!response.ok || (!ct.includes('application/pdf') && !ct.includes('application/octet-stream'))) {
          // Try to peek at body to detect HTML/login content
          const text = await response.clone().text().catch(() => '')
          if (response.status === 401 || /<html/i.test(text)) {
            throw new Error('Not authenticated. Please sign in and try again.')
          }
          throw new Error(`Failed to download PDF (${response.status})`)
        }

        blob = await response.blob()
        // Cache the PDF for future use
        pdfCache.set(url, blob)
      }

      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename || `document-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download PDF. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleViewPdf = (templateId?: string) => {
    const url = generatePdfUrl(templateId)
    setCurrentPdfUrl(url)
    setShowViewer(true)
  }

  const handleQuickView = () => {
    if (showTemplateSelector) {
      setShowTemplateModal(true)
    } else {
      handleViewPdf()
    }
  }

  const handleQuickDownload = () => {
    if (showTemplateSelector) {
      setShowTemplateModal(true)
    } else {
      handleDirectDownload()
    }
  }

  const onTemplateSelect = (templateId: string, action: 'view' | 'download') => {
    setShowTemplateModal(false)
    if (action === 'view') {
      handleViewPdf(templateId)
    } else {
      handleDirectDownload(templateId)
    }
  }

  // Icon variant
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleQuickView}
          disabled={loading}
          className={`p-2 rounded hover:bg-gray-50 text-gray-700 disabled:opacity-50 ${className}`}
          title={loading ? 'Loading...' : 'View PDF'}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        </button>

        {showTemplateModal && (
          <TemplateSelectionModal
            isOpen={showTemplateModal}
            onClose={() => setShowTemplateModal(false)}
            onSelect={(templateId) => onTemplateSelect(templateId, 'view')}
          />
        )}

        {showViewer && currentPdfUrl && (
          <PdfViewer
            isOpen={showViewer}
            pdfUrl={currentPdfUrl}
            filename={filename}
            onClose={() => {
              setShowViewer(false)
              setCurrentPdfUrl(null)
            }}
          />
        )}
      </>
    )
  }

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={loading}
          className={`flex items-center px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 ${className}`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Printer className="h-4 w-4 mr-2" />}
          PDF
          <ChevronDown className="h-4 w-4 ml-1" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
            <div className="py-1">
              <button
                onClick={() => {
                  setShowDropdown(false)
                  handleQuickView()
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Eye className="h-4 w-4 mr-2" />
                View PDF
              </button>
              <button
                onClick={() => {
                  setShowDropdown(false)
                  handleQuickDownload()
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </button>
            </div>
          </div>
        )}

        {showTemplateModal && (
          <TemplateSelectionModal
            isOpen={showTemplateModal}
            onClose={() => setShowTemplateModal(false)}
            onSelect={(templateId) => onTemplateSelect(templateId, 'view')}
          />
        )}

        {showViewer && currentPdfUrl && (
          <PdfViewer
            isOpen={showViewer}
            pdfUrl={currentPdfUrl}
            filename={filename}
            onClose={() => {
              setShowViewer(false)
              setCurrentPdfUrl(null)
            }}
          />
        )}
      </div>
    )
  }

  // Button variant (default)
  return (
    <>
      <button
        onClick={handleQuickView}
        disabled={loading}
        className={`flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors ${className}`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Eye className="h-4 w-4 mr-2" />
        )}
        {loading ? 'Loading...' : 'View PDF'}
      </button>

      {showTemplateModal && (
        <TemplateSelectionModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onSelect={(templateId) => onTemplateSelect(templateId, 'view')}
        />
      )}

      {showViewer && currentPdfUrl && (
        <PdfViewer
          isOpen={showViewer}
          pdfUrl={currentPdfUrl}
          filename={filename}
          onClose={() => {
            setShowViewer(false)
            setCurrentPdfUrl(null)
          }}
        />
      )}
    </>
  )
}
