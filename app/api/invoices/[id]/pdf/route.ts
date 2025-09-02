import { NextResponse, NextRequest } from 'next/server'
import jsPDF from 'jspdf'
import { db } from '@/lib/db'
import { getAnyActiveCompany } from '@/lib/company'
import { getUserFromRequest } from '@/lib/auth'

function inr(amount: any) {
  const n = Number(amount)
  if (!isFinite(n)) return ''
  // NOTE: Use ASCII-safe currency label for PDF to avoid unsupported glyphs (₹) in core fonts
  return 'INR ' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

type TemplateId = 'standard' | 'modern' | 'classic' | 'courier_aryan'

type TemplateStyle = {
  variant: 'band' | 'line' | 'classic'
  accent: [number, number, number]
  headerTextColor: [number, number, number]
  tableHeaderFill: boolean
}

function getTemplateStyle(t: string): TemplateStyle {
  const id = (t || '').toLowerCase()
  if (id === 'modern') {
    return { variant: 'band', accent: [16, 185, 129], headerTextColor: [255, 255, 255], tableHeaderFill: true }
  }
  if (id === 'classic') {
    return { variant: 'classic', accent: [55, 65, 81], headerTextColor: [0, 0, 0], tableHeaderFill: false }
  }
  // default standard
  return { variant: 'line', accent: [14, 165, 233], headerTextColor: [0, 0, 0], tableHeaderFill: true }
}

function drawHeaderStyled(doc: jsPDF, company: any, title: string, style: TemplateStyle) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 40
  let top = 36
  if (style.variant === 'band') {
    // full-width colored band
    doc.setFillColor(...style.accent)
    doc.rect(0, 0, pageWidth, 80, 'F')
    doc.setTextColor(...style.headerTextColor)
  } else {
    doc.setTextColor(0, 0, 0)
  }
  // Logo and company
  let logoBottomY = top
  if (company?.logo && typeof company.logo === 'string' && company.logo.startsWith('data:image/')) {
    try {
      const type = company.logo.includes('png') ? 'PNG' : 'JPEG'
      const maxW = 70, maxH = 40
      let w = maxW, h = maxH
      try {
        const props: any = (doc as any).getImageProperties ? (doc as any).getImageProperties(company.logo) : null
        if (props && props.width && props.height) {
          const ratio = props.width / props.height
          if (maxW / maxH > ratio) { h = Math.min(maxH, maxW / ratio, maxH); w = h * ratio } else { w = Math.min(maxW, maxH * ratio, maxW); h = w / ratio }
        }
      } catch {}
      doc.addImage(company.logo, type as any, left, top, w, h)
      logoBottomY = top + h
    } catch {}
  }
  const right = pageWidth - 40
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
  doc.text(company?.business_name || 'Company', right, 46, { align: 'right' as any })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  const addrRaw = String(company?.business_address || '')
  const addrWrapped = addrRaw ? doc.splitTextToSize(addrRaw, 260) : []
  if (addrWrapped.length) { doc.text(addrWrapped as any, right, 62, { align: 'right' as any }) }
  const phone = company?.phone_number ? `Phone: ${company.phone_number}` : ''
  const email = company?.email_id ? `Email: ${company.email_id}` : ''
  let y2 = addrWrapped.length ? (62 + (addrWrapped.length * 12) + 2) : 78
  if (phone) { doc.text(phone, right, y2, { align: 'right' as any }); y2 += 14 }
  if (email) { doc.text(email, right, y2, { align: 'right' as any }); y2 += 14 }
  if (company?.gstin) { doc.text(`GSTIN: ${company.gstin}`, right, y2, { align: 'right' as any }); y2 += 14 }

  // Title and decorative line if needed
  const titleY = Math.max(88, logoBottomY + 8, y2 + 10)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  doc.text(title, left, titleY)
  if (style.variant === 'line') {
    doc.setDrawColor(...style.accent); doc.setLineWidth(1.2); doc.line(left, titleY + 6, pageWidth - left, titleY + 6)
  }
  // reset text color for body
  doc.setTextColor(0, 0, 0)
  return Math.max(94, titleY + 26)
}

function drawSignature(doc: jsPDF, company: any) {
  if (company?.signature && typeof company.signature === 'string' && company.signature.startsWith('data:image/')) {
    try {
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text('Authorized Signatory', pageWidth - 150, pageHeight - 90)
      const type = company.signature.includes('png') ? 'PNG' : 'JPEG'
      doc.addImage(company.signature, type as any, pageWidth - 160, pageHeight - 85, 120, 40)
    } catch {}
  }
}

function inrNumber(n: number) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function numberToWordsINR(amount: number) {
  if (!isFinite(amount)) return ''
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const toWords = (num: number): string => {
    if (num === 0) return 'Zero'
    let w = ''
    const crore = Math.floor(num / 10000000); num %= 10000000
    const lakh = Math.floor(num / 100000); num %= 100000
    const thousand = Math.floor(num / 1000); num %= 1000
    const hundred = Math.floor(num / 100); num %= 100
    const two = num
    const join2 = (n: number) => (n < 20 ? ones[n] : (tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '')))
    if (crore) w += join2(crore) + ' Crore '
    if (lakh) w += join2(lakh) + ' Lakh '
    if (thousand) w += join2(thousand) + ' Thousand '
    if (hundred) w += ones[hundred] + ' Hundred '
    if (two) w += (w ? 'and ' : '') + join2(two) + ' '
    return w.trim()
  }
  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)
  const r = toWords(rupees) + ' Rupees'
  const p = paise ? ' and ' + toWords(paise) + ' Paisa' : ''
  return (r + p + ' only').replace(/\s+/g, ' ').trim()
}

// Extract a plausible city name from a free-form address string
function extractCityFromAddress(addr: string | null | undefined): string {
  const raw = (addr ?? '').toString().trim()
  if (!raw) return ''
  // Split by comma and trim parts
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean)
  if (!parts.length) return ''
  // Heuristic: examine from the end, pick the first token that contains letters and is not mostly digits/pincode-like
  for (let i = parts.length - 1; i >= 0; i--) {
    const token = parts[i]
    const hasAlpha = /[A-Za-z]/.test(token)
    const isPincodeLike = /\b\d{5,6}\b/.test(token)
    if (hasAlpha && !isPincodeLike) {
      // Remove trailing state codes or country if appended with hyphen/space
      const cleaned = token.replace(/[-–,]*\s*(India|IN)$/i, '').trim()
      return cleaned
    }
  }
  // Fallback to the first part
  return parts[0]
}

function distanceDisplay(region: string | null | undefined, recipientAddress: string | null | undefined): string {
  const r = (region ?? '').toString().trim().toLowerCase()
  // Treat these categories as city-display types (handle variants like 'within state')
  const isCityCategory = /(^|\b)(within|metro|other\s*state|out\s*of\s*state)(\b|$)/.test(r)
  if (isCityCategory) {
    const city = extractCityFromAddress(recipientAddress)
    return city || (region ?? '')
  }
  return (region ?? '')
}

// Convert non-data URL images to data URLs; support relative paths and raw base64
async function toDataUrlIfNeeded(src: string | null | undefined, baseOrigin: string): Promise<string | null> {
  if (!src || typeof src !== 'string') return null
  if (src.startsWith('data:image/')) return src
  const base64Only = /^[A-Za-z0-9+/]+={0,2}$/.test(src) && src.length % 4 === 0 && src.length > 100
  if (base64Only) return `data:image/png;base64,${src}`
  try {
    let url = src
    if (!/^https?:\/\//i.test(url)) { if (!url.startsWith('/')) url = '/' + url; url = baseOrigin + url }
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const lower = url.toLowerCase()
    const mime = lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'image/jpeg' : lower.endsWith('.webp') ? 'image/webp' : 'image/png'
    const b64 = Buffer.from(buf).toString('base64')
    return `data:${mime};base64,${b64}`
  } catch { return null }
}

// Load LakVee public logo as data URL so it can be embedded in jsPDF
async function loadLakveeLogoDataUrl(origin: string): Promise<string | null> {
  try {
    const path = '/lakvee-logo.png'
    const res = await fetch(origin + path)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const b64 = Buffer.from(buf).toString('base64')
    return 'data:image/png;base64,' + b64
  } catch {
    return null
  }
}

// Draw semi-transparent centered watermark on the current page
function addWatermark(doc: jsPDF, logoDataUrl: string) {
  try {
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 80
    const maxW = pageW - margin * 2
    const maxH = pageH - margin * 2
    // Try to get intrinsic ratio if possible; fallback to 1
    let ratio = 1
    try {
      const props: any = (doc as any).getImageProperties ? (doc as any).getImageProperties(logoDataUrl) : null
      if (props && props.width && props.height && props.height !== 0) ratio = props.width / props.height
    } catch {}
    let w = maxW
    let h = w / ratio
    if (h > maxH) { h = maxH; w = h * ratio }
    const x = (pageW - w) / 2
    const y = (pageH - h) / 2
    // Lower opacity if supported
    let reset: (() => void) | null = null
    try {
      const gs = new ( (doc as any).GState )( { opacity: 0.06 } )
      ;(doc as any).setGState(gs)
      reset = () => { try { const gs2 = new ( (doc as any).GState )( { opacity: 1 } ); (doc as any).setGState(gs2) } catch {} }
    } catch {}
    doc.addImage(logoDataUrl, 'PNG' as any, x, y, w, h)
    if (reset) reset()
  } catch {}
}

function drawHeader(doc: jsPDF, company: any, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 40
  let y = 40
  let logoBottomY = y
  if (company?.logo && typeof company.logo === 'string' && company.logo.startsWith('data:image/')) {
    try {
      const type = company.logo.includes('png') ? 'PNG' : 'JPEG'
      const maxW = 70, maxH = 40
      let w = maxW, h = maxH
      try {
        const props: any = (doc as any).getImageProperties ? (doc as any).getImageProperties(company.logo) : null
        if (props && props.width && props.height) {
          const ratio = props.width / props.height
          if (maxW / maxH > ratio) {
            h = Math.min(maxH, maxW / ratio, maxH)
            w = h * ratio
          } else {
            w = Math.min(maxW, maxH * ratio, maxW)
            h = w / ratio
          }
        }
      } catch {}
      doc.addImage(company.logo, type as any, left, y, w, h)
      logoBottomY = y + h
    } catch {}
  }
  const right = pageWidth - 40
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
  doc.text(company?.business_name || 'Company', right, 46, { align: 'right' as any })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  // Wrap address to avoid long single-line overlap and compute bottom
  const addrRaw = String(company?.business_address || '')
  const addrWrapped = addrRaw ? doc.splitTextToSize(addrRaw, 260) : []
  if (addrWrapped.length) { doc.text(addrWrapped as any, right, 62, { align: 'right' as any }) }
  const phone = company?.phone_number ? `Phone: ${company.phone_number}` : ''
  const email = company?.email_id ? `Email: ${company.email_id}` : ''
  let y2 = addrWrapped.length ? (62 + (addrWrapped.length * 12) + 2) : 78
  if (phone) { doc.text(phone, right, y2, { align: 'right' as any }); y2 += 14 }
  if (email) { doc.text(email, right, y2, { align: 'right' as any }); y2 += 14 }
  if (company?.gstin) { doc.text(`GSTIN: ${company.gstin}`, right, y2, { align: 'right' as any }); y2 += 14 }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  // Place title below both logo and right-side info to avoid overlap
  const titleY = Math.max(88, logoBottomY + 8, y2 + 10)
  doc.text(title, left, titleY)
  return Math.max(94, titleY + 26)
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // Check authentication first
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id } = params
  const url = new URL(request.url)
  const template = (url.searchParams.get('template') as TemplateId) || 'courier_aryan'
  try {
    // Fetch invoice header + party
    const invRes = await db.query(
      `SELECT i.*, p.party_name, p.phone AS party_phone, p.address AS party_address, p.city AS party_city, p.state AS party_state, p.pincode AS party_pincode, p.gst_number AS party_gstin
       FROM invoices i
       JOIN parties p ON i.party_id = p.id
       WHERE i.id = $1`,
      [id]
    )
    if (invRes.rowCount === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    const inv = invRes.rows[0]

    // Fetch consignments linked to this invoice
    const consRes = await db.query(
      `SELECT consignment_no, booking_date, shipment_type, mode, service_type, recipient_address, region, weight, chargeable_weight, retail_price, prepaid_amount, final_collected, calculated_amount, pricing_meta
       FROM csv_invoices
       WHERE invoice_id = $1
       ORDER BY created_at ASC`,
      [id]
    )
    const consignments = consRes.rows
    // Sort consignments by booking_date ascending (oldest first). Null/invalid dates go last.
    const parseTime = (d: any) => {
      if (!d) return Number.POSITIVE_INFINITY
      const t = new Date(d as any).getTime()
      return isFinite(t) ? t : Number.POSITIVE_INFINITY
    }
    consignments.sort((a: any, b: any) => parseTime(a.booking_date) - parseTime(b.booking_date))

    // Company
    const company = await getAnyActiveCompany()

    // Build PDF
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    // Watermark: LakVee logo centered at low opacity
    const origin = new URL(request.url).origin
    const lakveeLogo = await loadLakveeLogoDataUrl(origin)
    if (lakveeLogo) { addWatermark(doc, lakveeLogo) }
    // Normalize signature to data URL if needed
    try {
      const sigData = await toDataUrlIfNeeded((company as any)?.signature, origin)
      if (sigData) (company as any).signature = sigData
    } catch {}

    // If not courier_aryan, render themed variant and return
    if (template && template !== 'courier_aryan') {
      const styled = getTemplateStyle(template)
      let y = drawHeaderStyled(doc, company, 'Tax Invoice', styled)
      const left = 40
      const right = doc.internal.pageSize.getWidth() - 40

      // Summary box (same data parity, minor style tweak)
      const boxW = right - left
      const sbTop = y
      const sbLH = 14
      doc.setDrawColor(200)
      if (styled.variant !== 'classic') { doc.setFillColor(248, 250, 252); doc.rect(left, sbTop, boxW, 120, 'FD') } else { doc.rect(left, sbTop, boxW, 120) }

      doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
      doc.text('Invoice Details', left + 10, sbTop + 20)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text(`Invoice No: ${inv.invoice_number}`, left + 10, sbTop + 36)
      doc.text(`Invoice Date: ${inv.invoice_date ? (() => { const d = new Date(inv.invoice_date); const dd = String(d.getDate()).padStart(2,'0'); const mm = String(d.getMonth()+1).padStart(2,'0'); const yy = d.getFullYear(); return `${dd}-${mm}-${yy}` })() : ''}`, left + 10, sbTop + 36 + sbLH)

      doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
      doc.text('Bill To', left + boxW/2, sbTop + 20)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text(String(inv.party_name || ''), left + boxW/2, sbTop + 36)
      const addr = [inv.party_address, `${inv.party_city || ''}${inv.party_state ? ', ' + inv.party_state : ''}`, inv.party_pincode].filter(Boolean).join('\n')
      if (addr) { const lines = doc.splitTextToSize(addr, boxW/2 - 20); doc.text(lines, left + boxW/2, sbTop + 36 + sbLH) }
      if (inv.party_phone) doc.text(`Phone: ${inv.party_phone}`, left + boxW/2, sbTop + 36 + sbLH * 3.5)
      if (inv.party_gstin) doc.text(`GSTIN: ${inv.party_gstin}`, left + boxW/2, sbTop + 36 + sbLH * 4.5)

      y = sbTop + 120 + 14

      // Table header (reordered): S.NO., Booking Date, Consignment No, Mode, Service, Distance, Weight (Kg), Amount
      const headers = ['S.NO.', 'Booking Date', 'Consignment No', 'Mode', 'Service', 'Distance', 'Weight (Kg)', 'Amount']
      type Align = 'left' | 'center' | 'right'
      const aligns: Align[] = ['center','left','left','left','left','left','right','right']
      const headerAligns: Align[] = ['center','center','center','center','center','center','right','right']
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
      doc.setDrawColor(180)
      doc.setLineWidth(0.15)

      const rows = consignments.map((it:any, idx:number) => {
        const sno = idx + 1
        const weight = Number(it.weight ?? 0)
        const meta: any = it?.pricing_meta || null
        const slabBase = meta?.rate_breakup?.base ?? meta?.base ?? meta?.rate_breakup?.baseRate
        const base = Number((slabBase ?? it.calculated_amount ?? it.prepaid_amount ?? it.final_collected ?? it.retail_price ?? 0))
        const distance = distanceDisplay(it.region, it.recipient_address)
        const bookingDate = it.booking_date ? (() => { const d = new Date(it.booking_date); const dd = String(d.getDate()).padStart(2,'0'); const mm = String(d.getMonth()+1).padStart(2,'0'); const yy = d.getFullYear(); return `${dd}-${mm}-${yy}` })() : ''
        return [ String(sno), String(bookingDate), String(it.consignment_no || ''), String(it.mode || ''), String(it.service_type || ''), String(distance || ''), inrNumber(weight), inrNumber(base) ]
      })

      const usableW = doc.internal.pageSize.getWidth() - left - (right ?? (doc.internal.pageSize.getWidth() - left - 515))
      // Width presets adjusted for new order (S.NO., Booking Date, Consignment No)
      // Increase Mode (index 3) min/max to keep 'Non-Document' on one line (hard minimum)
      const minW = [26, 60, 70, 120, 50, 50, 58, 68]
      const maxW = [40, 95, 120, 160, 85, 90, 70, 95]
      const padd = 10
      const cellPadL = 8
      const cellPadR = 8
      const widths: number[] = new Array(headers.length).fill(0)
      const measure = (txt: string) => doc.getTextWidth(txt)
      for (let c = 0; c < headers.length; c++) { widths[c] = Math.min(maxW[c], Math.max(minW[c], measure(headers[c]) + padd)) }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
      for (const r of rows) { for (let c = 0; c < r.length; c++) { widths[c] = Math.min(maxW[c], Math.max(widths[c], measure(String(r[c])) + padd)) } }
      let sumW = widths.reduce((a,b)=>a+b,0)
      const targetW = 515
      if (sumW !== targetW) { const scale = targetW / sumW; for (let i = 0; i < widths.length; i++) { widths[i] = Math.max(minW[i], Math.min(maxW[i], widths[i] * scale)) } const delta = targetW - widths.reduce((a,b)=>a+b,0); widths[widths.length-1] += delta }
      const x2: number[] = []; { let acc = left; for (const w of widths) { x2.push(acc); acc += w } }

      const headerH = 24
      if (styled.tableHeaderFill) { doc.setFillColor(...styled.accent); doc.rect(x2[0], y, targetW, headerH, 'F'); doc.setTextColor(255,255,255) } else { doc.rect(x2[0], y, targetW, headerH); doc.setTextColor(0,0,0) }
      for (let i = 1; i < x2.length; i++) { doc.line(x2[i], y, x2[i], y + headerH) }
      const hc = (idx:number)=> x2[idx] + widths[idx] / 2
      const headerBaseline = y + headerH / 2 + 5
      for (let c = 0; c < headers.length; c++) {
        if (headerAligns[c] === 'right') doc.text(headers[c], x2[c] + widths[c] - cellPadR, headerBaseline, { align: 'right' as any })
        else if (headerAligns[c] === 'center') doc.text(headers[c], hc(c), headerBaseline, { align: 'center' as any })
        else doc.text(headers[c], x2[c] + cellPadL, headerBaseline)
      }
      doc.setTextColor(0,0,0)
      y += headerH

      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
      const pageHeight = doc.internal.pageSize.getHeight()
      const bottomMargin = 140
      const lineH = 9.2
      const vPad = 12
      let subtotalBase = 0
      let rowIndex = 0
      for (const it of consignments) {
        const cellLines: string[][] = []
        let rowH = 0
        const data = rows[rowIndex]
        for (let c = 0; c < data.length; c++) {
          const content = String(data[c])
          const wrapW = widths[c] - padd
          // Do not wrap Mode (index 3) so terms like 'Non-Document' stay on one line
          const lines = (c === 3) ? [content] : (doc.splitTextToSize(content, wrapW) as string[])
          cellLines.push(lines)
          rowH = Math.max(rowH, vPad * 2 + lines.length * lineH)
        }
        if (y + rowH > pageHeight - bottomMargin) {
          doc.addPage(); if (lakveeLogo) { addWatermark(doc, lakveeLogo) }
          y = drawHeaderStyled(doc, company, 'Tax Invoice', styled)
          // redraw header row
          if (styled.tableHeaderFill) { doc.setFillColor(...styled.accent); doc.rect(x2[0], y, headerH + targetW - headerH, headerH, 'F'); doc.setTextColor(255,255,255) } else { doc.rect(x2[0], y, targetW, headerH); doc.setTextColor(0,0,0) }
          for (let i = 1; i < x2.length; i++) { doc.line(x2[i], y, x2[i], y + headerH) }
          const headerBaseline2 = y + headerH / 2 + 5
          for (let c = 0; c < headers.length; c++) { if (headerAligns[c] === 'right') doc.text(headers[c], x2[c] + widths[c] - cellPadR, headerBaseline2, { align: 'right' as any }); else if (headerAligns[c] === 'center') doc.text(headers[c], hc(c), headerBaseline2, { align: 'center' as any }); else doc.text(headers[c], x2[c] + cellPadL, headerBaseline2) }
          y += headerH; doc.setTextColor(0,0,0)
        }
        subtotalBase += Number(rows[rowIndex][7].replace(/,/g,'')) || 0
        doc.rect(x2[0], y, targetW, rowH)
        for (let i = 1; i < x2.length; i++) { doc.line(x2[i], y, x2[i], y + rowH) }
        for (let c = 0; c < cellLines.length; c++) {
          const lines = cellLines[c]; const startX = aligns[c] === 'right' ? x2[c] + widths[c] - cellPadR : aligns[c] === 'center' ? x2[c] + widths[c]/2 : (c === 3 ? x2[c] + 4 : x2[c] + cellPadL)
          let offsetY = y + vPad + lineH
          const restoreSize = 8.5
          if (c === 3) doc.setFontSize(8.0)
          for (const ln of lines) { if (aligns[c] === 'right') doc.text(String(ln), startX, offsetY, { align: 'right' as any }); else if (aligns[c] === 'center') doc.text(String(ln), startX, offsetY, { align: 'center' as any }); else doc.text(String(ln), startX, offsetY); offsetY += lineH }
          if (c === 3) doc.setFontSize(restoreSize)
        }
        y += rowH
        rowIndex++
      }

      // Totals computation parity
      const slab = (inv as any).slab_breakdown || {}
      const fuelPct = Number(slab.fuel_pct || 0)
      const packing = Number(slab.packing || 0)
      const handling = Number(slab.handling || 0)
      const gstPct = Number((slab as any).gst_pct ?? (slab as any).gst_percent ?? 0)
      const computedSubFromBases = Number(isFinite(subtotalBase) ? subtotalBase : 0)
      const fuelAmtComputed = computedSubFromBases * (fuelPct / 100)
      const baseForGstComputed = computedSubFromBases + fuelAmtComputed + packing + handling
      const gstHalfPct = gstPct ? (gstPct / 2) : 0
      const sgstAmtComputed = gstHalfPct ? (baseForGstComputed * (gstHalfPct / 100)) : 0
      const cgstAmtComputed = gstHalfPct ? (baseForGstComputed * (gstHalfPct / 100)) : 0
      const gstAmtComputed = sgstAmtComputed + cgstAmtComputed
      const totalComputed = computedSubFromBases + fuelAmtComputed + packing + handling + gstAmtComputed
      const subTotal = Number(computedSubFromBases) || 0
      const total = Number(totalComputed) || 0

      // Styled totals block
      y += 16
      const boxW2 = 360
      const sbLeft = left
      const sbTop2 = y
      const sbLH2 = 16
      doc.setDrawColor(180)
      if (template === 'modern') { doc.setFillColor(236, 253, 245); doc.rect(sbLeft, sbTop2, boxW2, sbLH2 * 8 + 24, 'FD') } else if (template === 'standard') { doc.setFillColor(239, 246, 255); doc.rect(sbLeft, sbTop2, boxW2, sbLH2 * 8 + 24, 'FD') } else { doc.rect(sbLeft, sbTop2, boxW2, sbLH2 * 8 + 24) }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
      doc.text('Pricing Breakdown', sbLeft + 10, sbTop2 + 16)
      doc.setFont('courier', 'normal')
      const slabelX = sbLeft + 12
      const scolonX = sbLeft + 180
      const svalueX = sbLeft + boxW2 - 12
      let sy = sbTop2 + 30
      const put = (label: string, value: string) => { doc.text(label, slabelX, sy); doc.text(':', scolonX, sy); doc.text(value, svalueX, sy, { align: 'right' as any }); sy += sbLH2 }
      put('Subtotal', `INR ${inrNumber(subTotal)}`)
      if (fuelPct) put(`Fuel (${inrNumber(fuelPct)}%)`, `INR ${inrNumber(fuelAmtComputed)}`)
      if (packing) put('Packing', `INR ${inrNumber(packing)}`)
      if (handling) put('Handling', `INR ${inrNumber(handling)}`)
      if (gstPct) { put(`SGST (${inrNumber(gstHalfPct)}%)`, `INR ${inrNumber(sgstAmtComputed)}`); put(`CGST (${inrNumber(gstHalfPct)}%)`, `INR ${inrNumber(cgstAmtComputed)}`) }
      doc.setFont('courier', 'bold'); put('Total', `INR ${inrNumber(total)}`); doc.setFont('courier', 'normal')
      y = sbTop2 + (sbLH2 * 8 + 24) + 24

      // Amount in words
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Invoice Amount in Words:', left, y)
      y += 14; doc.setFont('helvetica', 'normal'); const words = doc.splitTextToSize(numberToWordsINR(total), 480); doc.text(words, left, y)

      // Total / Received / Balance box
      y += 28
      const tLeft = left
      const tWidth = 515
      const tCols = [tLeft, tLeft + tWidth/3, tLeft + 2*tWidth/3, tLeft + tWidth]
      const tRowH = 24
      const tTop = y
      doc.setDrawColor(0)
      if (template === 'modern') { doc.setFillColor(...styled.accent); doc.rect(tCols[0], tTop, tWidth, tRowH, 'F'); doc.setTextColor(255,255,255) } else { doc.setTextColor(0,0,0) }
      // header row borders
      doc.line(tCols[0], tTop, tCols[3], tTop)
      doc.line(tCols[0], tTop + tRowH, tCols[3], tTop + tRowH)
      for (let i = 0; i < tCols.length; i++) { doc.line(tCols[i], tTop, tCols[i], tTop + tRowH) }
      doc.setFont('helvetica', 'bold')
      doc.text('Total', tCols[0] + 8, tTop + 15)
      doc.text('Received', tCols[1] + 8, tTop + 15)
      doc.text('Balance', tCols[2] + 8, tTop + 15)
      doc.setTextColor(0,0,0)
      // values row
      const vTop = tTop + tRowH
      doc.line(tCols[0], vTop, tCols[3], vTop)
      doc.line(tCols[0], vTop + tRowH, tCols[3], vTop + tRowH)
      for (let i = 0; i < tCols.length; i++) { doc.line(tCols[i], vTop, tCols[i], vTop + tRowH) }
      const receivedAmt = Number((inv as any).received_amount ?? 0)
      const balanceAmt = Math.max(total - receivedAmt, 0)
      doc.setFont('helvetica', 'normal')
      doc.text(inr(total), tCols[0] + 8, vTop + 15)
      doc.text(inr(receivedAmt), tCols[1] + 8, vTop + 15)
      doc.text(inr(balanceAmt), tCols[2] + 8, vTop + 15)

      // Signature and return
      drawSignature(doc, company)
      const pdfBytes2 = doc.output('arraybuffer') as ArrayBuffer
      return new NextResponse(Buffer.from(pdfBytes2), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="invoice-${inv.invoice_number}.pdf"`, 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', Pragma: 'no-cache', Expires: '0' } })
    }

    let y = drawHeader(doc, company, 'Tax Invoice')

    const left = 40
    const right = doc.internal.pageSize.getWidth() - 40

    // Invoice + party summary box
    const boxW = right - left
    const sbTop = y
    const sbLH = 14
    doc.setDrawColor(200)
    doc.rect(left, sbTop, boxW, 120)

    doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text('Invoice Details', left + 10, sbTop + 20)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    doc.text(`Invoice No: ${inv.invoice_number}`, left + 10, sbTop + 36)
    const invoiceDate = inv.invoice_date ? (() => { const d = new Date(inv.invoice_date); const dd = String(d.getDate()).padStart(2,'0'); const mm = String(d.getMonth()+1).padStart(2,'0'); const yy = d.getFullYear(); return `${dd}-${mm}-${yy}` })() : ''
    doc.text(`Invoice Date: ${invoiceDate}`, left + 10, sbTop + 36 + sbLH)
    

    doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text('Bill To', left + boxW/2, sbTop + 20)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    doc.text(String(inv.party_name || ''), left + boxW/2, sbTop + 36)
    const addr = [inv.party_address, `${inv.party_city || ''}${inv.party_state ? ', ' + inv.party_state : ''}`, inv.party_pincode].filter(Boolean).join('\n')
    if (addr) {
      const lines = doc.splitTextToSize(addr, boxW/2 - 20)
      doc.text(lines, left + boxW/2, sbTop + 36 + sbLH)
    }
    if (inv.party_phone) doc.text(`Phone: ${inv.party_phone}`, left + boxW/2, sbTop + 36 + sbLH * 3.5)
    if (inv.party_gstin) doc.text(`GSTIN: ${inv.party_gstin}`, left + boxW/2, sbTop + 36 + sbLH * 4.5)

    y = sbTop + 120 + 14

    // Consignments table (auto-fit) — reordered first three columns as requested
    const headers = ['S.NO.', 'Booking Date', 'Consignment No', 'Mode', 'Service', 'Distance', 'Weight (Kg)', 'Amount']
    type Align = 'left' | 'center' | 'right'
    // Data alignment: numeric right-aligned; S.No centered; text left-aligned
    const aligns: Align[] = ['center','left','left','left','left','left','right','right']
    // Header alignment
    const headerAligns: Align[] = ['center','center','center','center','center','center','right','right']
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
    doc.setDrawColor(180)
    doc.setLineWidth(0.15)

    // Prepare row strings
    const rows = consignments.map((it:any, idx:number) => {
      const sno = idx + 1
      const weight = Number(it.weight ?? 0)
      // Amount shown in invoice table should match the "Slab Rate" visible in the CSV list
      const meta: any = it?.pricing_meta || null
      const slabBase = meta?.rate_breakup?.base ?? meta?.base ?? meta?.rate_breakup?.baseRate
      // Priority: slab base (if present) -> calculated_amount -> prepaid_amount -> final_collected -> retail_price
      const base = Number(
        (slabBase ?? it.calculated_amount ?? it.prepaid_amount ?? it.final_collected ?? it.retail_price ?? 0)
      )
      const distance = distanceDisplay(it.region, it.recipient_address)
      const bookingDate = it.booking_date ? (() => { const d = new Date(it.booking_date); const dd = String(d.getDate()).padStart(2,'0'); const mm = String(d.getMonth()+1).padStart(2,'0'); const yy = d.getFullYear(); return `${dd}-${mm}-${yy}` })() : ''
      return [
        String(sno),
        String(bookingDate),
        String(it.consignment_no || ''),
        String(it.mode || ''),
        String(it.service_type || ''),
        String(distance || ''),
        inrNumber(weight),
        inrNumber(base)
      ]
    })

    // Compute dynamic widths from content
    const usableW = doc.internal.pageSize.getWidth() - left - (right ?? (doc.internal.pageSize.getWidth() - left - 515))
    // Width presets adjusted for new order (S.NO., Booking Date, Consignment No)
    // Increase Mode (index 3) min/max to keep 'Non-Document' on one line (hard minimum)
    const minW = [26, 60, 70, 110, 50, 50, 58, 68]
    const maxW = [40, 110, 130, 150, 90, 90, 70, 95]
    const padd = 10
    const cellPadL = 8
    const cellPadR = 8
    const widths: number[] = new Array(headers.length).fill(0)
    const measure = (txt: string) => doc.getTextWidth(txt)
    // Start with header widths
    for (let c = 0; c < headers.length; c++) {
      widths[c] = Math.min(maxW[c], Math.max(minW[c], measure(headers[c]) + padd))
    }
    // Expand per cell content
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
    for (const r of rows) {
      for (let c = 0; c < r.length; c++) {
        widths[c] = Math.min(maxW[c], Math.max(widths[c], measure(String(r[c])) + padd))
      }
    }
    // Scale to fit usable width
    let sumW = widths.reduce((a,b)=>a+b,0)
    const targetW = 515 // keep within our original usable width budget
    if (sumW !== targetW) {
      const scale = targetW / sumW
      for (let i = 0; i < widths.length; i++) {
        widths[i] = Math.max(minW[i], Math.min(maxW[i], widths[i] * scale))
      }
      sumW = widths.reduce((a,b)=>a+b,0)
      // fine tune last column to make exact fit
      const delta = targetW - sumW
      widths[widths.length-1] += delta
    }

    // X positions
    const x2: number[] = []
    { let acc = left; for (const w of widths) { x2.push(acc); acc += w } }

    // Draw header row
    const headerH = 24
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
    doc.rect(x2[0], y, targetW, headerH)
    for (let i = 1; i < x2.length; i++) { doc.line(x2[i], y, x2[i], y + headerH) }
    const hc = (idx:number)=> x2[idx] + widths[idx] / 2
    const headerBaseline = y + headerH / 2 + 5
    for (let c = 0; c < headers.length; c++) {
      if (headerAligns[c] === 'right') doc.text(headers[c], x2[c] + widths[c] - cellPadR, headerBaseline, { align: 'right' as any })
      else if (headerAligns[c] === 'center') doc.text(headers[c], hc(c), headerBaseline, { align: 'center' as any })
      else doc.text(headers[c], x2[c] + cellPadL, headerBaseline)
    }
    y += headerH

    // Rows with wrapping and dynamic height
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
    const pageHeight = doc.internal.pageSize.getHeight()
    const bottomMargin = 140
    const lineH = 9.2
    const vPad = 12
    let subtotalBase = 0
    let rowIndex = 0
    for (const it of consignments) {
      // compute row height based on wrapped content
      const cellLines: string[][] = []
      let rowH = 0
      {
        const qty = 1
        const weight = Number(it.chargeable_weight ?? it.weight ?? 0)
        const base = Number(it.retail_price ?? it.prepaid_amount ?? it.final_collected ?? 0)
      }
      const data = rows[rowIndex]
      for (let c = 0; c < data.length; c++) {
        const content = String(data[c])
        const wrapW = widths[c] - padd
        // Do not wrap Mode (index 3)
        const lines = (c === 3) ? [content] : (doc.splitTextToSize(content, wrapW) as string[])
        cellLines.push(lines)
        rowH = Math.max(rowH, vPad * 2 + lines.length * lineH)
      }

      if (y + rowH > pageHeight - bottomMargin) {
        doc.addPage()
        // Re-apply watermark on each new page
        if (lakveeLogo) { addWatermark(doc, lakveeLogo) }
        y = drawHeader(doc, company, 'Tax Invoice')
        // redraw header on new page
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
        doc.rect(x2[0], y, targetW, headerH)
        for (let i = 1; i < x2.length; i++) { doc.line(x2[i], y, x2[i], y + headerH) }
        const headerBaseline2 = y + headerH / 2 + 5
        for (let c = 0; c < headers.length; c++) {
          if (headerAligns[c] === 'right') doc.text(headers[c], x2[c] + widths[c] - cellPadR, headerBaseline2, { align: 'right' as any })
          else if (headerAligns[c] === 'center') doc.text(headers[c], hc(c), headerBaseline2, { align: 'center' as any })
          else doc.text(headers[c], x2[c] + cellPadL, headerBaseline2)
        }
        y += headerH
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
      }
      // Draw row box and separators
      subtotalBase += Number(rows[rowIndex][7].replace(/,/g,'')) || 0
      doc.rect(x2[0], y, targetW, rowH)
      for (let i = 1; i < x2.length; i++) { doc.line(x2[i], y, x2[i], y + rowH) }
      // Draw wrapped text per cell
      for (let c = 0; c < cellLines.length; c++) {
        const lines = cellLines[c]
        const startX = aligns[c] === 'right' ? x2[c] + widths[c] - cellPadR : aligns[c] === 'center' ? x2[c] + widths[c]/2 : x2[c] + cellPadL
        // Start a bit below the top to avoid touching the top rule
        const contentH = lines.length * lineH
        let offsetY = y + vPad + lineH
        const restoreSize = 8.5
        if (c === 3) doc.setFontSize(8.2)
        for (const ln of lines) {
          if (aligns[c] === 'right') doc.text(String(ln), startX, offsetY, { align: 'right' as any })
          else if (aligns[c] === 'center') doc.text(String(ln), startX, offsetY, { align: 'center' as any })
          else doc.text(String(ln), startX, offsetY)
          offsetY += lineH
        }
        if (c === 3) doc.setFontSize(restoreSize)
      }
      y += rowH
      rowIndex++
    }

    // Totals: prefer stored invoice values to ensure consistency with Sales list and UI
    // Fall back to computing from slab_breakdown only if missing
    const slab = (inv as any).slab_breakdown || {}
    const fuelPct = Number(slab.fuel_pct || 0)
    const packing = Number(slab.packing || 0)
    const handling = Number(slab.handling || 0)
    const gstPct = Number((slab as any).gst_pct ?? (slab as any).gst_percent ?? 0)

    const computedSubFromBases = Number(isFinite(subtotalBase) ? subtotalBase : 0)
    const fuelAmtComputed = computedSubFromBases * (fuelPct / 100)
    const baseForGstComputed = computedSubFromBases + fuelAmtComputed + packing + handling
    const gstHalfPct = gstPct ? (gstPct / 2) : 0
    const sgstAmtComputed = gstHalfPct ? (baseForGstComputed * (gstHalfPct / 100)) : 0
    const cgstAmtComputed = gstHalfPct ? (baseForGstComputed * (gstHalfPct / 100)) : 0
    const gstAmtComputed = sgstAmtComputed + cgstAmtComputed
    const totalComputed = computedSubFromBases + fuelAmtComputed + packing + handling + gstAmtComputed

    // Subtotal in the PDF should equal the sum of the "Amount" column shown above
    const subTotal = Number(computedSubFromBases) || 0
    const gstAmt = Number(gstAmtComputed) || 0
    const total = Number(totalComputed) || 0

    y += 16
    const boxW2 = 360
    const sbLeft = left
    const sbTop2 = y
    const sbLH2 = 16
    doc.setDrawColor(180)
    doc.rect(sbLeft, sbTop2, boxW2, sbLH2 * 8 + 24)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text('Pricing Breakdown', sbLeft + 10, sbTop2 + 16)
    doc.setFont('courier', 'normal')
    const slabelX = sbLeft + 12
    const scolonX = sbLeft + 180
    const svalueX = sbLeft + boxW2 - 12
    let sy = sbTop2 + 30
    const put = (label: string, value: string) => {
      doc.text(label, slabelX, sy)
      doc.text(':', scolonX, sy)
      doc.text(value, svalueX, sy, { align: 'right' as any })
      sy += sbLH2
    }
    put('Subtotal', `INR ${inrNumber(subTotal)}`)
    if (fuelPct) put(`Fuel (${inrNumber(fuelPct)}%)`, `INR ${inrNumber(fuelAmtComputed)}`)
    if (packing) put('Packing', `INR ${inrNumber(packing)}`)
    if (handling) put('Handling', `INR ${inrNumber(handling)}`)
    if (gstPct) {
      put(`SGST (${inrNumber(gstHalfPct)}%)`, `INR ${inrNumber(sgstAmtComputed)}`)
      put(`CGST (${inrNumber(gstHalfPct)}%)`, `INR ${inrNumber(cgstAmtComputed)}`)
    }
    doc.setFont('courier', 'bold')
    put('Total', `INR ${inrNumber(total)}`)
    doc.setFont('courier', 'normal')
    y = sbTop2 + (sbLH2 * 8 + 24) + 24

    // Amount in words
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text('Invoice Amount in Words:', left, y)
    y += 14; doc.setFont('helvetica', 'normal')
    const words = doc.splitTextToSize(numberToWordsINR(total), 480)
    doc.text(words, left, y)

    // Total / Received / Balance box (uses inv.received_amount)
    y += 28
    const tLeft = left
    const tWidth = 515
    const tCols = [tLeft, tLeft + tWidth/3, tLeft + 2*tWidth/3, tLeft + tWidth]
    const tRowH = 24
    const tTop = y
    // header row
    doc.setDrawColor(0)
    doc.line(tCols[0], tTop, tCols[3], tTop)
    doc.line(tCols[0], tTop + tRowH, tCols[3], tTop + tRowH)
    for (let i = 0; i < tCols.length; i++) { doc.line(tCols[i], tTop, tCols[i], tTop + tRowH) }
    doc.setFont('helvetica', 'bold')
    doc.text('Total', tCols[0] + 8, tTop + 15)
    doc.text('Received', tCols[1] + 8, tTop + 15)
    doc.text('Balance', tCols[2] + 8, tTop + 15)
    // values row
    const vTop = tTop + tRowH
    doc.line(tCols[0], vTop, tCols[3], vTop)
    doc.line(tCols[0], vTop + tRowH, tCols[3], vTop + tRowH)
    for (let i = 0; i < tCols.length; i++) { doc.line(tCols[i], vTop, tCols[i], vTop + tRowH) }
    const receivedAmt = Number((inv as any).received_amount ?? 0)
    const balanceAmt = Math.max(total - receivedAmt, 0)
    doc.setFont('helvetica', 'normal')
    doc.text(inr(total), tCols[0] + 8, vTop + 15)
    doc.text(inr(receivedAmt), tCols[1] + 8, vTop + 15)
    doc.text(inr(balanceAmt), tCols[2] + 8, vTop + 15)

    // Draw signature on the final page
    drawSignature(doc, company)
    const pdfBytes = doc.output('arraybuffer') as ArrayBuffer
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${inv.invoice_number}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0'
      }
    })
  } catch (e) {
    console.error('Error generating invoice PDF:', e)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
