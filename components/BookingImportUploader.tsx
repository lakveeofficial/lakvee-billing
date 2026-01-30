'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { Loader2, Download, Upload, FileText } from 'lucide-react'

interface BookingImportUploaderProps {
  type: 'booking' | 'offline'
  onUploadSuccess?: () => void
}

export default function BookingImportUploader({ type, onUploadSuccess }: BookingImportUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setMessage(null)
    }
  }

  const downloadTemplate = async () => {
    try {
      setMessage({ text: 'Downloading template...', type: 'success' })
      
      const templateData = type === 'booking' 
        ? `DATE OF BOOKING,SENDER NAME,RECEIVER NAME,MOBILE,CARRIER,REFERENCE NUMBER,PACKAGE TYPE,WEIGHT,NUMBER OF BOXES,GROSS AMOUNT,OTHER CHARGES,INSURANCE AMOUNT,PARCEL VALUE,NET AMOUNT,REMARKS
2025-01-17,John Doe,Jane Smith,9876543210,DHL,REF001,DOX,0.5,1,100,10,5,1000,115,Sample booking`
        : `DATE OF BOOKING,SENDER NAME,RECEIVER NAME,MOBILE,CARRIER,REFERENCE NUMBER,PACKAGE TYPE,WEIGHT,NUMBER OF BOXES,GROSS AMOUNT,OTHER CHARGES,INSURANCE AMOUNT,PARCEL VALUE,NET AMOUNT,REMARKS,OFFLINE STATUS
2025-01-17,John Doe,Jane Smith,9876543210,DHL,REF001,DOX,0.5,1,100,10,5,1000,115,Sample offline booking,PENDING`

      const blob = new Blob([templateData], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_import_template.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
      
      setMessage({ text: 'Template downloaded successfully', type: 'success' })
    } catch (error) {
      console.error('Error downloading template:', error)
      setMessage({ 
        text: 'Failed to download template. Please try again.', 
        type: 'error' 
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('handleSubmit called')
    if (!file) {
      console.log('No file selected')
      setMessage({ text: 'Please select a file', type: 'error' })
      return
    }

    console.log('Starting upload for file:', file.name, 'size:', file.size)
    setIsUploading(true)
    setMessage({ text: 'Uploading and processing file...', type: 'success' })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    console.log('FormData prepared, sending to /api/bookings/import')

    try {
      const uploadUrl = type === 'booking' ? '/api/bookings/bulk-upload' : '/api/bookings/import'
      const response = await fetch(uploadUrl, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      console.log('Response received:', response.status, response.statusText)

      const data = await response.json()
      console.log('Response data:', data)

      if (!response.ok) {
        // Detailed error handling
        if (data.missingFields) {
          throw new Error(`Missing required fields: ${data.missingFields.join(', ')}`)
        }
        if (data.details) {
          throw new Error(`Error: ${data.error}. Details: ${data.details}`)
        }
        throw new Error(data.error || `Server error (${response.status}): Failed to process CSV`)
      }

      setMessage({
        text: `Successfully processed ${data.totalRecords} ${type} records${data.message ? ` - ${data.message}` : ''}`,
        type: 'success'
      })

      // Reset form
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Call success callback
      onUploadSuccess?.()

    } catch (error: any) {
      console.error('Upload error:', error)
      let errorMessage = 'Error processing CSV file'

      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }

      console.log('Setting error message:', errorMessage)
      setMessage({
        text: errorMessage,
        type: 'error'
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={downloadTemplate}
          disabled={isUploading}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Download Template
        </button>
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
        >
          <FileText className="h-4 w-4" />
          Browse...
        </button>
      </div>

      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        {file && (
          <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
            Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
          </div>
        )}

        <div className="text-sm text-slate-600">
          Click <span className="underline cursor-pointer" onClick={downloadTemplate}>here</span> to download {type === 'offline' ? 'Offline Parcel Import excel' : 'Booking Import excel'} template file
        </div>

        {file && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import
              </>
            )}
          </button>
        )}
      </div>

      {message && (
        <div 
          className={`p-3 rounded-md text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
