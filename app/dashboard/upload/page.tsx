'use client'

import { useState, useRef } from 'react'
import { Upload, Download, FileText, Users, Receipt, AlertCircle, CheckCircle, X, Eye } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { CSVService } from '@/lib/csvService'
import { CSVParseResult, ImportPreview, ImportResult } from '@/types/upload'

export default function CSVUploadPage() {
  const [selectedType, setSelectedType] = useState<'parties' | 'sales' | 'invoices' | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<'select' | 'upload' | 'preview' | 'result'>('select')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTypeSelect = (type: 'parties' | 'sales' | 'invoices') => {
    setSelectedType(type)
    setCurrentStep('upload')
    setFile(null)
    setParseResult(null)
    setPreview(null)
    setImportResult(null)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    setFile(selectedFile)
    setIsProcessing(true)

    try {
      const result = await CSVService.parseCSV(selectedFile)
      setParseResult(result)
      
      if (selectedType) {
        const previewData = CSVService.generatePreview(result, selectedType)
        setPreview(previewData)
        setCurrentStep('preview')
      }
    } catch (error) {
      alert(`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (!parseResult || !selectedType || !preview) return

    setIsProcessing(true)

    try {
      // If importing invoices, send the original file to the backend CSV invoices endpoint
      if (selectedType === 'invoices') {
        if (!file) throw new Error('No file selected')
        const form = new FormData()
        form.append('file', file)

        const resp = await fetch('/api/csv-invoices/import', { method: 'POST', body: form })
        const data = await resp.json()

        const imported = data?.inserted ?? 0
        const totalRows = preview.totalRows
        const result: ImportResult = {
          success: resp.ok,
          imported,
          skipped: Math.max(0, totalRows - imported),
          errors: [],
          message: data?.message || (resp.ok ? 'CSV invoices imported' : 'Import failed')
        }
        setImportResult(result)
      } else {
        const { validData } = CSVService.validateData(parseResult.data, selectedType)
        const result: ImportResult = await CSVService.processCSVImport(validData as any[], selectedType)
        setImportResult(result)
      }
      setCurrentStep('result')
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadTemplate = () => {
    if (selectedType) {
      if (selectedType === 'invoices') {
        // Use dedicated server-generated template for CSV invoices structure
        window.location.href = '/api/csv-invoices/template'
      } else {
        CSVService.downloadTemplate(selectedType)
      }
    }
  }

  const resetUpload = () => {
    setSelectedType(null)
    setFile(null)
    setParseResult(null)
    setPreview(null)
    setImportResult(null)
    setCurrentStep('select')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="CSV Upload"
        subtitle="Import parties, sales, and invoice CSV files"
        actions={
          selectedType ? (
            <button
              onClick={resetUpload}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-rose-200" />
              Start Over
            </button>
          ) : null
        }
      />

      {/* Progress Steps */}
      <div className="flex items-center space-x-4">
        {['Select Type', 'Upload File', 'Preview Data', 'Import Results'].map((step, index) => {
          const stepNumber = index + 1
          const isActive = 
            (currentStep === 'select' && stepNumber === 1) ||
            (currentStep === 'upload' && stepNumber === 2) ||
            (currentStep === 'preview' && stepNumber === 3) ||
            (currentStep === 'result' && stepNumber === 4)
          const isCompleted = 
            (currentStep !== 'select' && stepNumber === 1) ||
            (currentStep === 'preview' && stepNumber === 2) ||
            (currentStep === 'result' && stepNumber === 3) ||
            (currentStep === 'result' && stepNumber === 4 && importResult?.success)

          return (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                isCompleted 
                  ? 'bg-green-500 text-white' 
                  : isActive 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
              }`}>
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : stepNumber}
              </div>
              <span className={`ml-2 text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                {step}
              </span>
              {index < 3 && <div className="w-8 h-px bg-gray-300 mx-4" />}
            </div>
          )
        })}
      </div>

      {/* Step 1: Select Upload Type */}
      {currentStep === 'select' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => handleTypeSelect('parties')}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
          >
            <Users className="h-12 w-12 text-blue-500 mb-2" />
            <h3 className="text-lg font-medium">Import Parties</h3>
            <p className="text-sm text-gray-500 text-center">Upload a CSV file with customer or vendor details</p>
          </button>

          <button
            type="button"
            onClick={() => handleTypeSelect('sales')}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 transition-colors"
          >
            <Receipt className="h-12 w-12 text-green-500 mb-2" />
            <h3 className="text-lg font-medium">Import Sales</h3>
            <p className="text-sm text-gray-500 text-center">Upload a CSV file with sales transaction data</p>
          </button>

          <button
            type="button"
            onClick={() => handleTypeSelect('invoices')}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 transition-colors"
          >
            <FileText className="h-12 w-12 text-purple-500 mb-2" />
            <h3 className="text-lg font-medium">Import Invoices</h3>
            <p className="text-sm text-gray-500 text-center">Upload a CSV file with invoice data</p>
          </button>
        </div>
      )}

      {/* Step 2: File Upload */}
      {currentStep === 'upload' && selectedType && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Upload {selectedType === 'parties' ? 'Parties' : selectedType === 'sales' ? 'Sales' : 'Invoices'} CSV</h2>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">Choose a CSV file to upload</p>
              <p className="text-gray-600">or drag and drop it here</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Select File'}
            </button>
          </div>

          {file && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Preview Data */}
      {currentStep === 'preview' && preview && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Total Rows</p>
                  <p className="text-2xl font-bold text-blue-900">{preview.totalRows}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Valid Rows</p>
                  <p className="text-2xl font-bold text-green-900">{preview.validRows}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Invalid Rows</p>
                  <p className="text-2xl font-bold text-red-900">{preview.invalidRows}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Errors</p>
                  <p className="text-2xl font-bold text-yellow-900">{preview.errors.length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
          </div>

          {/* Sample Data Preview */}
          {preview.sampleData.length > 0 && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Sample Valid Data (First 5 rows)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(preview.sampleData[0]).map((header) => (
                        <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.sampleData.map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors */}
          {preview.errors.length > 0 && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                Validation Errors
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {preview.errors.slice(0, 20).map((error, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium text-red-900">Row {error.row}</span>
                      {error.field && <span className="text-red-700"> - {error.field}</span>}
                      <span className="text-red-600">: {error.message}</span>
                    </div>
                  </div>
                ))}
                {preview.errors.length > 20 && (
                  <p className="text-sm text-gray-600 text-center">
                    ... and {preview.errors.length - 20} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep('upload')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back to Upload
            </button>
            <button
              onClick={handleImport}
              disabled={preview.validRows === 0 || isProcessing}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isProcessing ? 'Importing...' : `Import ${preview.validRows} Valid Records`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Import Results */}
      {currentStep === 'result' && importResult && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="text-center mb-6">
            {importResult.success ? (
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            ) : (
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            )}
            <h2 className={`text-2xl font-bold mb-2 ${importResult.success ? 'text-green-900' : 'text-red-900'}`}>
              {importResult.success ? 'Import Successful!' : 'Import Failed'}
            </h2>
            <p className="text-gray-600">{importResult.message}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-sm text-green-600">Imported</p>
              <p className="text-2xl font-bold text-green-900">{importResult.imported}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <p className="text-sm text-yellow-600">Skipped</p>
              <p className="text-2xl font-bold text-yellow-900">{importResult.skipped}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <p className="text-sm text-red-600">Errors</p>
              <p className="text-2xl font-bold text-red-900">{importResult.errors.length}</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-red-600">Import Errors</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {importResult.errors.map((error, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium text-red-900">Row {error.row}</span>
                      <span className="text-red-600">: {error.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <button
              onClick={resetUpload}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Upload Another File
            </button>
            <button
              onClick={() => {
                if (selectedType === 'parties') window.location.href = '/dashboard/parties'
                else if (selectedType === 'sales') window.location.href = '/dashboard/invoices'
                else window.location.href = '/dashboard/csv-invoices'
              }}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              View {selectedType === 'parties' ? 'Parties' : selectedType === 'sales' ? 'Invoices' : 'CSV Invoices'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
