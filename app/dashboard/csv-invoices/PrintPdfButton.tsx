import { useState } from 'react'
import { FileText } from 'lucide-react'

interface PrintPdfButtonProps {
  invoiceId: string
}

export default function PrintPdfButton({ invoiceId }: PrintPdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handlePdfDownload = async () => {
    setIsLoading(true)
    try {
      // Create a form and submit it to ensure cookies are sent
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = `/api/csv-invoices/${invoiceId}/pdf`
      form.target = '_blank'
      form.style.display = 'none'
      
      // Add template parameter
      const templateInput = document.createElement('input')
      templateInput.type = 'hidden'
      templateInput.name = 'template'
      templateInput.value = 'courier_aryan'
      form.appendChild(templateInput)
      
      document.body.appendChild(form)
      form.submit()
      document.body.removeChild(form)
    } catch (error) {
      console.error('PDF download failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handlePdfDownload}
      disabled={isLoading}
      className="p-2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
      title="Download PDF"
    >
      <FileText className="h-4 w-4" />
    </button>
  )
}
