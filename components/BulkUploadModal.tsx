"use client"

import { useState, useRef } from 'react'
import { X, Upload, Download, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react'

interface BulkUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess: (insertedRecords: any[]) => void
}

export default function BulkUploadModal({ isOpen, onClose, onUploadSuccess }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [uploadedCount, setUploadedCount] = useState(0)
  const [duplicateCount, setDuplicateCount] = useState(0)
  const [missingPartyCount, setMissingPartyCount] = useState(0)
  const [duplicates, setDuplicates] = useState<Array<{ row: number; reason: string; reference?: string }>>([])
  const [missingParties, setMissingParties] = useState<Array<{ row: number; party: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const downloadTemplate = () => {
    const today = new Date().toISOString().split('T')[0]
    const templateData = `DATE OF BOOKING,SENDER NAME,RECEIVER NAME,MOBILE,CARRIER,REFERENCE NUMBER,PACKAGE TYPE,WEIGHT,WEIGHT UNIT,NUMBER OF BOXES,GROSS AMOUNT,OTHER CHARGES,INSURANCE AMOUNT,PARCEL VALUE,NET AMOUNT,REMARKS,CENTER
${today},John Doe,Jane Smith,9876543210,DHL,REF001,DOX,0.5,kg,1,100,10,5,1000,115,Sample booking,Mumbai`


    const blob = new Blob([templateData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'account_booking_template.csv'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    a.remove()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setStatus('error')
        setMessage('Please select a CSV file')
        return
      }
      setFile(selectedFile)
      setStatus('idle')
      setMessage('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setStatus('error')
      setMessage('Please select a file')
      return
    }

    setIsUploading(true)
    setStatus('uploading')
    setMessage('Uploading and processing records...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      console.log('Starting bulk upload:', file.name)
      const response = await fetch('/api/bookings/bulk-upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Upload failed')
      }

      setStatus('success')
      setUploadedCount(data.uploadedCount || data.totalRecords || 0)
      setDuplicateCount(data.duplicateCount || 0)
      setMissingPartyCount(data.missingPartyCount || 0)
      setDuplicates(Array.isArray(data.duplicates) ? data.duplicates : [])
      setMissingParties(Array.isArray(data.missingParties) ? data.missingParties : [])
      setMessage(data.message || `Uploaded ${data.uploadedCount || data.totalRecords || 0} records${(data.duplicateCount || 0) ? `, duplicates skipped: ${data.duplicateCount}` : ''}${(data.missingPartyCount || 0) ? `, missing parties: ${data.missingPartyCount}` : ''}`)

      console.log('Upload successful, calling onUploadSuccess...')
      onUploadSuccess(Array.isArray(data.insertedRecords) ? data.insertedRecords : [])

      // If there are per-row warnings (duplicates or missing parties), do NOT auto-close.
      // Let the user review the warnings. Otherwise, close after a short delay.
      const hasWarnings = (data.duplicateCount || 0) > 0 || (data.missingPartyCount || 0) > 0
      if (!hasWarnings) {
        setTimeout(() => {
          console.log('Closing modal after timeout')
          handleClose()
        }, 2000)
      }

    } catch (error: any) {
      console.error('Upload error:', error)
      setStatus('error')
      setMessage(error.message || 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setStatus('idle')
    setMessage('')
    setUploadedCount(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Upload Account Bookings
          </h3>
          <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Download the template file</li>
              <li>Fill in the booking details</li>
              <li>Upload the CSV file</li>
              <li>Records will be imported automatically</li>
            </ol>
          </div>

          {/* Download Template */}
          <button
            type="button"
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-colors"
          >
            <Download className="h-5 w-5 text-slate-600" />
            <span className="text-slate-700 font-medium">Download CSV Template</span>
          </button>

          {/* File Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Select CSV File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={isUploading}
            />
          </div>

          {/* Selected File Info */}
          {file && (
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              {!isUploading && (
                <button
                  onClick={() => {
                    setFile(null)
                    setStatus('idle')
                    setMessage('')
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              )}
            </div>
          )}

          {/* Status Message */}
          {status !== 'idle' && (
            <div className={`flex items-center gap-3 p-4 rounded-xl ${status === 'success' ? 'bg-green-50 border border-green-200' :
              status === 'error' ? 'bg-red-50 border border-red-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
              {status === 'uploading' && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
              {status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {status === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
              <p className={`text-sm ${status === 'success' ? 'text-green-800' :
                status === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                {message}
              </p>
            </div>
          )}

          {/* Detailed results */}
          {status === 'success' && (duplicateCount > 0 || missingPartyCount > 0) && (
            <div className="space-y-3 bg-white border border-slate-200 rounded-xl p-4">
              {duplicateCount > 0 && (
                <div>
                  <div className="text-sm font-medium text-slate-900 mb-1">Duplicates skipped ({duplicateCount})</div>
                  <ul className="text-sm text-slate-700 list-disc list-inside space-y-1 max-h-40 overflow-auto">
                    {duplicates.slice(0, 20).map((d, idx) => (
                      <li key={idx}>Row {d.row}: {d.reason}{d.reference ? ` (Ref: ${d.reference})` : ''}</li>
                    ))}
                    {duplicateCount > 20 && (
                      <li className="text-slate-500">+{duplicateCount - 20} more…</li>
                    )}
                  </ul>
                </div>
              )}
              {missingPartyCount > 0 && (
                <div>
                  <div className="text-sm font-medium text-slate-900 mb-1">Missing parties ({missingPartyCount})</div>
                  <ul className="text-sm text-slate-700 list-disc list-inside space-y-1 max-h-40 overflow-auto">
                    {missingParties.slice(0, 20).map((m, idx) => (
                      <li key={idx}>Row {m.row}: Party not created - {m.party || 'Unknown'}</li>
                    ))}
                    {missingPartyCount > 20 && (
                      <li className="text-slate-500">+{missingPartyCount - 20} more…</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Upload Bookings
              </>
            )}
          </button>
        </div>

        <div className="flex justify-end p-4 border-t bg-slate-50">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
