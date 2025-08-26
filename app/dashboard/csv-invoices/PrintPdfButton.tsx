import EnhancedPdfButton from '@/components/EnhancedPdfButton'

export default function PrintPdfButton({ id }: { id: string }) {
  return (
    <EnhancedPdfButton
      id={id}
      apiPath="/api/csv-invoices"
      filename={`csv-invoice-${id}.pdf`}
      variant="icon"
      showTemplateSelector={true}
    />
  )
}
