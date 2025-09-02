import { NextResponse, NextRequest } from 'next/server'
import jsPDF from 'jspdf'
import { db } from '@/lib/db'
import { getAnyActiveCompany } from '@/lib/company'
import { getUserFromRequest } from '@/lib/auth'

function inr(amount: any) {
  const n = Number(amount)
  if (!isFinite(n)) return ''
  // Use ASCII-safe currency label for PDF to avoid unsupported glyphs (₹) in core fonts
  return 'INR ' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

// Safely compute GST-inclusive total from a rate_breakup object. If rb.total
// is missing or less than subtotal+gst (common data issue), we compute
// subtotal and gst from the available fields and return subtotal + gst.
function computeGSTInclusiveTotalFromRB(rb: any): number {
  try {
    const b = Number(rb?.base || 0)
    const f = Number(rb?.fuel || 0)
    const p = Number(rb?.packing || 0)
    const h = Number(rb?.handling || 0)
    const st = Number(rb?.subtotal)
    const subtotal = isFinite(st) && st > 0 ? st : (b + f + p + h)
    const gp = Number(rb?.gstPct ?? rb?.gst_pct)
    const gstPct = isFinite(gp) && gp > 0 ? gp : 18
    const gField = Number(rb?.gst)
    const gst = isFinite(gField) && gField > 0 ? gField : +(subtotal * gstPct / 100).toFixed(2)
    const inferredTotal = +(subtotal + gst).toFixed(2)
    const t = Number(rb?.total)
    if (isFinite(t) && t >= inferredTotal - 0.01) return +t.toFixed(2)
    return inferredTotal
  } catch {
    return 0
  }
}

async function toDataUrlIfNeeded(src: string | null | undefined, baseOrigin: string): Promise<string | null> {
  if (!src || typeof src !== 'string') return null
  // Already a data URL
  if (src.startsWith('data:image/')) return src
  // Raw base64 without data URL header
  const base64Only = /^[A-Za-z0-9+/]+={0,2}$/.test(src) && src.length % 4 === 0 && src.length > 100
  if (base64Only) {
    // Assume PNG if unknown
    return `data:image/png;base64,${src}`
  }
  try {
    let url = src
    // Handle relative paths like 'signature.png' or 'images/sign.jpg'
    if (!/^https?:\/\//i.test(url)) {
      if (!url.startsWith('/')) url = '/' + url
      url = baseOrigin + url
    }
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    // Try infer mime from url; default to png
    const lower = url.toLowerCase()
    const mime = lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'image/jpeg' : lower.endsWith('.webp') ? 'image/webp' : 'image/png'
    const b64 = Buffer.from(buf).toString('base64')
    return `data:${mime};base64,${b64}`
  } catch {
    return null
  }
}

function inrNumber(n: number) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

// Convert number to words (Indian system, rupees and paise)
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
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean)
  if (!parts.length) return ''
  for (let i = parts.length - 1; i >= 0; i--) {
    const token = parts[i]
    const hasAlpha = /[A-Za-z]/.test(token)
    const isPincodeLike = /\b\d{5,6}\b/.test(token)
    if (hasAlpha && !isPincodeLike) {
      const cleaned = token.replace(/[-–,]*\s*(India|IN)$/i, '').trim()
      return cleaned
    }
  }
  return parts[0]
}

function distanceDisplay(region: string | null | undefined, recipientAddress: string | null | undefined): string {
  const r = (region ?? '').toString().trim().toLowerCase()
  // Handle variants like 'within state', 'within', 'metro', 'other state', 'out of state'
  const isCityCategory = /(^|\b)(within|metro|other\s*state|out\s*of\s*state)(\b|$)/.test(r)
  if (isCityCategory) {
    const city = extractCityFromAddress(recipientAddress)
    return city || (region ?? '')
  }
  return (region ?? '')
}

// Load LakVee public logo as data URL for watermark
async function loadLakveeLogoDataUrl(origin: string): Promise<string | null> {
  try {
    const res = await fetch(origin + '/lakvee-logo.png')
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

// Split gross amount into subtotal and GST at given rate (assumes gross is tax-inclusive)
function splitGSTFromGross(gross: number, ratePercent = 18) {
  const r = Number(ratePercent)
  if (!isFinite(gross) || gross <= 0 || !isFinite(r) || r <= 0) return { subTotal: gross || 0, gst: 0, total: gross || 0 }
  const subTotal = +(gross / (1 + r/100)).toFixed(2)
  const gst = +(gross - subTotal).toFixed(2)
  return { subTotal, gst, total: +(gross.toFixed(2)) }
}

function drawHeader(doc: jsPDF, company: any, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 40
  let y = 40
  let logoBottomY = y
  // Logo left
  if (company?.logo && typeof company.logo === 'string' && company.logo.startsWith('data:image/')) {
    try {
      const type = company.logo.includes('png') ? 'PNG' : 'JPEG'
      // Fit within 70x40 box while preserving aspect ratio (object-fit: contain)
      const maxW = 70, maxH = 40
      let w = maxW, h = maxH
      try {
        const props: any = (doc as any).getImageProperties ? (doc as any).getImageProperties(company.logo) : null
        if (props && props.width && props.height) {
          const ratio = props.width / props.height
          // scale to fit inside maxW x maxH
          if (maxW / maxH > ratio) {
            // box is wider than image ratio -> limit by height
            h = Math.min(maxH, maxW / ratio, maxH)
            w = h * ratio
          } else {
            // box is taller than image ratio -> limit by width
            w = Math.min(maxW, maxH * ratio, maxW)
            h = w / ratio
          }
        }
      } catch {}
      const x = left
      const yImg = y - 8 + (maxH - h) / 2 // vertically center within box
      doc.addImage(company.logo, type as any, x, yImg, w, h)
      logoBottomY = yImg + h
    } catch {}
  }
  // Company info right
  const rightX = pageWidth - 40
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
  doc.text(String(company?.business_name || 'Company Name'), rightX, y, { align: 'right' as any })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  const infoRaw = [
    String([company?.business_address, company?.state, company?.pincode].filter(Boolean).join(', ')),
    company?.phone_number ? `Phone: ${company.phone_number}` : '',
    company?.email_id ? `Email: ${company.email_id}` : ''
  ].filter(Boolean) as string[]
  y += 12
  infoRaw.forEach((t) => {
    const wrapped = doc.splitTextToSize(t, 260)
    doc.text(wrapped, rightX, y, { align: 'right' as any })
    y += (wrapped.length || 1) * 10 + 2
  })

  // Title centered (ensure below logo and info)
  const titleY = Math.max(y + 10, logoBottomY + 8)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
  doc.text(title, pageWidth / 2, titleY, { align: 'center' as any })
  const lineY = titleY + 12
  doc.setDrawColor(200); doc.line(40, lineY, pageWidth - 40, lineY)
  return lineY + 12
}

function drawSignature(doc: jsPDF, company: any) {
  if (company?.signature && typeof company.signature === 'string' && company.signature.startsWith('data:image/')) {
    try {
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text('Authorized Signatory', pageWidth - 140, pageHeight - 90)
      const type = company.signature.includes('png') ? 'PNG' : 'JPEG'
      doc.addImage(company.signature, type as any, pageWidth - 150, pageHeight - 85, 110, 40)
    } catch {}
  }
}

function drawSalesTemplate(doc: jsPDF, company: any, row: any) {
  const left = 40
  const lineH = 16
  let y = drawHeader(doc, company, 'Tax Invoice')

  // Meta two columns
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  const col2 = 300
  const meta = [
    [`Invoice ID`, row.id],
    [`Booking Date`, row.booking_date || ''],
    [`Consignment No`, row.consignment_no || ''],
    [`Booking Ref`, row.booking_reference || ''],
    [`Mode / Service`, `${row.mode || ''} / ${row.service_type || ''}`],
  ]
  meta.slice(0,3).forEach(([k,v], i) => { doc.text(`${k}:`, left, y + i*lineH); doc.text(String(v ?? ''), left+120, y + i*lineH) })
  meta.slice(3).forEach(([k,v], i) => { doc.text(`${k}:`, col2, y + i*lineH); doc.text(String(v ?? ''), col2+120, y + i*lineH) })
  y += 3*lineH + 10

  // Parties two-column box
  doc.setFont('helvetica', 'bold'); doc.text('Bill To / Ship To', left, y)
  y += 8
  doc.setDrawColor(220); doc.rect(left, y, 515, 70)
  doc.setFont('helvetica', 'normal')
  const lcolX = left + 8, rcolX = left + 260
  const py = y + 16
  // Left (Sender)
  doc.text('Sender', lcolX, py)
  doc.text(String(row.sender_name || ''), lcolX, py + 12)
  doc.text(String(row.sender_phone || ''), lcolX, py + 24)
  doc.text(String(row.sender_address || ''), lcolX, py + 36, { maxWidth: 230 })
  // Right (Recipient)
  doc.text('Recipient', rcolX, py)
  doc.text(String(row.recipient_name || ''), rcolX, py + 12)
  doc.text(String(row.recipient_phone || ''), rcolX, py + 24)
  doc.text(String(row.recipient_address || ''), rcolX, py + 36, { maxWidth: 230 })
  y += 70 + 16

  // Amounts table: prefer GST-inclusive total computed from pricing_meta if available
  const baseAmt = Number(row.retail_price ?? row.final_collected ?? 0)
  const slabAmt = Number((row as any).calculated_amount ?? 0)
  const total = (isFinite(baseAmt) ? baseAmt : 0) + (isFinite(slabAmt) ? slabAmt : 0)
  const rbMetaEarly: any = ((row as any).pricing_meta || {})
  const gstInclusiveTotalEarly = (rbMetaEarly && rbMetaEarly.rate_breakup)
    ? computeGSTInclusiveTotalFromRB(rbMetaEarly.rate_breakup)
    : 0
  const displayTotal = isFinite(gstInclusiveTotalEarly) && gstInclusiveTotalEarly > 0 ? gstInclusiveTotalEarly : total
  const received = Number(row.received_amount ?? 0)
  const displayBalance = displayTotal - received
  doc.setFont('helvetica', 'bold'); doc.text('Amounts', left, y)
  y += 6
  doc.setDrawColor(0)
  const tTop = y + 6
  const tLeft = left
  const tWidth = 515
  const cols = [tLeft, tLeft + tWidth/3, tLeft + 2*tWidth/3, tLeft + tWidth]
  const rowH = 24
  // Header row
  doc.line(cols[0], tTop, cols[3], tTop)
  doc.line(cols[0], tTop + rowH, cols[3], tTop + rowH)
  doc.line(cols[0], tTop, cols[0], tTop + rowH)
  doc.line(cols[1], tTop, cols[1], tTop + rowH)
  doc.line(cols[2], tTop, cols[2], tTop + rowH)
  doc.line(cols[3], tTop, cols[3], tTop + rowH)
  doc.setFont('helvetica', 'bold')
  doc.text('Total', cols[0] + 8, tTop + 15)
  doc.text('Received', cols[1] + 8, tTop + 15)
  doc.text('Balance', cols[2] + 8, tTop + 15)
  // Values row
  const r2Top = tTop + rowH
  doc.line(cols[0], r2Top, cols[3], r2Top)
  doc.line(cols[0], r2Top + rowH, cols[3], r2Top + rowH)
  doc.line(cols[0], r2Top, cols[0], r2Top + rowH)
  doc.line(cols[1], r2Top, cols[1], r2Top + rowH)
  doc.line(cols[2], r2Top, cols[2], r2Top + rowH)
  doc.line(cols[3], r2Top, cols[3], r2Top + rowH)
  doc.setFont('helvetica', 'normal')
  doc.text(inr(displayTotal), cols[0] + 8, r2Top + 15)
  doc.text(inr(received), cols[1] + 8, r2Top + 15)
  doc.text(inr(displayBalance), cols[2] + 8, r2Top + 15)

  // Footer notes
  doc.setFontSize(9)
  const notes: string[] = []
  if (row.payment_mode) notes.push(`Payment Mode: ${row.payment_mode}`)
  if (row.payment_utr) notes.push(`UTR: ${row.payment_utr}`)
  if (row.contents) notes.push(`Contents: ${row.contents}`)
  if (row.eway_bill) notes.push(`Eway Bill: ${row.eway_bill}`)
  if (row.gst_invoice) notes.push(`GST Invoice: ${row.gst_invoice}`)
  if (notes.length) { doc.text(notes.join('  |  '), left, r2Top + rowH + 32) }
  // Pricing Breakdown (if available)
  let yAfter = r2Top + rowH + 48
  const rbMeta: any = ((row as any).pricing_meta || {})
  let salesBreakdownTotal: number | null = null
  if (rbMeta && typeof rbMeta === 'object' && rbMeta.rate_breakup) {
    const rb = rbMeta.rate_breakup as any
    const b = Number(rb.base || 0)
    const fp = Number(rb.fuelPct || rb.fuel_pct || 0)
    const f = Number(rb.fuel || 0)
    const p = Number(rb.packing || 0)
    const h = Number(rb.handling || 0)
    const st = Number(rb.subtotal || (b + f + p + h))
    const gp = Number(rb.gstPct || rb.gst_pct || rbMeta.gst_percent || 18)
    const g = Number(rb.gst || (st * gp / 100))
    const sg = +(g / 2).toFixed(2)
    const cg = +(g - sg).toFixed(2)
    const tt = computeGSTInclusiveTotalFromRB(rb)
    salesBreakdownTotal = tt
    const sbLeft = left
    const sbTop = yAfter
    const sbW = 360
    const sbLH = 16
    doc.setDrawColor(180)
    doc.rect(sbLeft, sbTop, sbW, sbLH * 8 + 24)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text('Pricing Breakdown', sbLeft + 10, sbTop + 16)
    doc.setFont('courier', 'normal')
    const slabelX = sbLeft + 12
    const scolonX = sbLeft + 180
    const svalueX = sbLeft + sbW - 12
    let sy = sbTop + 30
    const put = (label: string, value: string) => {
      doc.text(label, slabelX, sy)
      doc.text(':', scolonX, sy)
      doc.text(value, svalueX, sy, { align: 'right' as any })
      sy += sbLH
    }
    put('Base Rate', `INR ${inrNumber(b)}`)
    put(`Fuel (${inrNumber(fp)}%)`, `INR ${inrNumber(f)}`)
    put('Packing', `INR ${inrNumber(p)}`)
    put('Handling', `INR ${inrNumber(h)}`)
    put('Subtotal', `INR ${inrNumber(st)}`)
    put(`SGST (${inrNumber(gp/2)}%)`, `INR ${inrNumber(sg)}`)
    put(`CGST (${inrNumber(gp/2)}%)`, `INR ${inrNumber(cg)}`)
    doc.setFont('courier', 'bold')
    put('Total', `INR ${inrNumber(tt)}`)
    doc.setFont('courier', 'normal')
    yAfter = sbTop + (sbLH * 8 + 24) + 24
  }

  // Amount in words (use breakdown total if present)
  doc.setFont('helvetica', 'bold'); doc.text('Invoice Amount in Words:', left, yAfter)
  yAfter += 14; doc.setFont('helvetica', 'normal')
  const totalForWordsSales = (salesBreakdownTotal ?? total)
  const wordsSales = doc.splitTextToSize(numberToWordsINR(totalForWordsSales), 500)
  doc.text(wordsSales, left, yAfter)

  // Signature block
  drawSignature(doc, company)
}

// Courier-style template inspired by the provided Aryan Logistics sample
function drawCourierAryanTemplate(doc: jsPDF, company: any, row: any) {
  const left = 40
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = drawHeader(doc, company, 'Tax Invoice')

  // Company box below header (bold title already drawn by header)
  // Bill To and Invoice Details side-by-side
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  doc.text('Bill To:', left, y)
  // Shift right box left slightly so both boxes respect page margins
  const rightBoxX = left + 280
  doc.text('Invoice Details:', rightBoxX, y)
  y += 6
  doc.setDrawColor(200)
  // dynamic height based on wrapped text; increased to fit extra details
  let boxH = 140
  doc.rect(left, y, 260, boxH)
  // Right box width reduced to keep 40pt right margin
  doc.rect(rightBoxX, y, 235, boxH)
  doc.setFont('helvetica', 'normal')
  // Bill To content
  let by = y + 16
  doc.text(String(row.recipient_name || row.customer || ''), left + 8, by)
  by += 12
  const rAddr = doc.splitTextToSize(String(row.recipient_address || ''), 240)
  doc.text(rAddr, left + 8, by)
  by += Math.max(12, (rAddr.length || 1) * 12)
  doc.text((row.recipient_phone ? 'Contact: ' + row.recipient_phone : ''), left + 8, by)
  // Invoice Details content
  let iy = y + 16
  const fmtDate = (d: any) => {
    if (!d) return ''
    try {
      const dt = new Date(d)
      const dd = String(dt.getDate()).padStart(2, '0')
      const mm = String(dt.getMonth() + 1).padStart(2, '0')
      const yyyy = dt.getFullYear()
      return `${dd}-${mm}-${yyyy}`
    } catch { return String(d) }
  }
  const details = [
    `Party: ${String(row.sender_name || '')}`,
    `Shipment Type: ${String(row.shipment_type || '')}`,
    `Mode: ${String(row.mode || '')}`,
    `Service Type: ${String(row.service_type || '')}`,
    `Place Of Supply: ${String(distanceDisplay((row.region || row.destination || '') as any, row.recipient_address))}`,
  ]
  details.forEach((t) => { doc.text(t, rightBoxX + 8, iy); iy += 12 })

  y += boxH + 20

  // Items table header
  const tLeft = left
  const tWidth = pageWidth - left * 2 // keep 40pt margins on both sides => 515 on A4
  // Column widths: [SNO, DATE, ITEM, DEST, WEIGHT, AMOUNT] must sum to tWidth
  const cW = {
    sno: 40,
    // Keep width assignments but we'll render Booking Date in the second column and Consignment No in the third
    item: 140,
    date: 110,
    dest: 110,
    wt: 60,
    amt: tWidth - (40 + 140 + 110 + 110 + 60),
  }
  const cols = [
    tLeft,                          // S.NO left
    tLeft + cW.sno,                 // DATE left (now second)
    tLeft + cW.sno + cW.date,       // ITEM left (now third)
    tLeft + cW.sno + cW.date + cW.item, // DEST left
    tLeft + cW.sno + cW.item + cW.date + cW.dest, // WEIGHT left
    tLeft + cW.sno + cW.item + cW.date + cW.dest + cW.wt, // AMOUNT left
    tLeft + tWidth                   // table right edge
  ]
  const rowH = 26
  const headerTop = y
  doc.setDrawColor(120)
  doc.line(cols[0], headerTop, cols[6], headerTop)
  doc.line(cols[0], headerTop + rowH, cols[6], headerTop + rowH)
  for (let i = 0; i < cols.length; i++) { doc.line(cols[i], headerTop, cols[i], headerTop + rowH) }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  doc.text('S.NO.', cols[0] + 6, headerTop + 14)
  doc.text('BOOKING DATE', cols[1] + 6, headerTop + 14)
  doc.text('CONSIGNMENT NO', cols[2] + 6, headerTop + 14)
  doc.text('DESTINATION', cols[3] + 6, headerTop + 14)
  doc.text('WEIGHT', cols[4] + 6, headerTop + 14)
  doc.text('Amount', cols[5] + 6, headerTop + 14)

  // Single data row from CSV
  const dataTop = headerTop + rowH
  // Wrap item and destination; compute dynamic row height
  const padX = 6
  const cellLineH = 12
  // Consignment now in third column, so wrap against width between cols[3] and cols[2]
  const itemText = doc.splitTextToSize(String(row.consignment_no || row.booking_reference || '-'), (cols[3] - cols[2]) - padX*2)
  const destText = doc.splitTextToSize(String(distanceDisplay((row.region || row.destination || '') as any, row.recipient_address)), (cols[4] - cols[3]) - padX*2)
  const linesCount = Math.max(itemText.length || 1, destText.length || 1)
  const dataRowH = Math.max(rowH, 14 + (linesCount - 1) * cellLineH)
  // Draw borders for data row
  doc.line(cols[0], dataTop, cols[6], dataTop)
  doc.line(cols[0], dataTop + dataRowH, cols[6], dataTop + dataRowH)
  for (let i = 0; i < cols.length; i++) { doc.line(cols[i], dataTop, cols[i], dataTop + dataRowH) }
  // Fill data
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text('1', cols[0] + padX, dataTop + 14)
  // Booking Date now second column
  doc.text(fmtDate(row.booking_date), cols[1] + padX, dataTop + 14)
  // Consignment No now third column
  doc.text(itemText, cols[2] + padX, dataTop + 14)
  doc.text(destText, cols[3] + padX, dataTop + 14)
  doc.text(String(row.weight || row.chargeable_weight || ''), cols[4] + padX, dataTop + 14)
  // Use base + slab for gross (for totals/words); show Base Rate only in Amount column
  const baseAmt2 = Number(row.retail_price || row.final_collected || 0)
  const slabAmt2 = Number((row as any).calculated_amount ?? 0)
  const gross = (isFinite(baseAmt2) ? baseAmt2 : 0) + (isFinite(slabAmt2) ? slabAmt2 : 0)
  const metaForBase: any = ((row as any).pricing_meta || null)
  const baseOnlySrc = (metaForBase?.rate_breakup?.base ?? metaForBase?.base ?? baseAmt2)
  const baseOnly = Number(baseOnlySrc ?? 0)
  if ((doc as any).setCharSpace) { try { (doc as any).setCharSpace(0) } catch {} }
  doc.setFont('courier', 'normal')
  doc.text(inrNumber(baseOnly), cols[6] - padX, dataTop + 14, { align: 'right' as any })
  doc.setFont('helvetica', 'normal')

  y = dataTop + dataRowH + 24

  // Payment section only (totals box removed)
  const meta = ((row as any).pricing_meta || {}) as any
  doc.setFont('helvetica', 'bold'); doc.text('Payment Mode:', left, y)
  doc.setFont('helvetica', 'normal'); doc.text(String(row.payment_mode || 'Credit'), left + 100, y)
  // Track breakdown total if available
  let breakdownTotal: number | null = null

  // Slab Rate Breakdown (from pricing_meta)
  if (meta && typeof meta === 'object' && meta.rate_breakup) {
    const rb = meta.rate_breakup as any
    const b = Number(rb.base || 0)
    const fp = Number(rb.fuelPct || rb.fuel_pct || 0)
    const f = Number(rb.fuel || 0)
    const p = Number(rb.packing || 0)
    const h = Number(rb.handling || 0)
    const st = Number(rb.subtotal || (b + f + p + h))
    const gp = Number(rb.gstPct || rb.gst_pct || meta.gst_percent || 18)
    const g = Number(rb.gst || (st * gp / 100))
    const sg = +(g / 2).toFixed(2)
    const cg = +(g - sg).toFixed(2)
    const tt = computeGSTInclusiveTotalFromRB(rb)
    breakdownTotal = tt
    // Box - placed below Payment Mode
    const sbLeft = left
    const sbTop = y + 20
    const sbW = 360
    const sbLH = 16
    doc.setDrawColor(180)
    doc.rect(sbLeft, sbTop, sbW, sbLH * 8 + 24)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text('Pricing Breakdown', sbLeft + 10, sbTop + 16)
    doc.setFont('courier', 'normal')
    const slabelX = sbLeft + 12
    const scolonX = sbLeft + 180
    const svalueX = sbLeft + sbW - 12
    let sy = sbTop + 30
    const put = (label: string, value: string) => {
      doc.text(label, slabelX, sy)
      doc.text(':', scolonX, sy)
      doc.text(value, svalueX, sy, { align: 'right' as any })
      sy += sbLH
    }
    put('Base Rate', `INR ${inrNumber(b)}`)
    put(`Fuel (${inrNumber(fp)}%)`, `INR ${inrNumber(f)}`)
    put('Packing', `INR ${inrNumber(p)}`)
    put('Handling', `INR ${inrNumber(h)}`)
    put('Subtotal', `INR ${inrNumber(st)}`)
    put(`SGST (${inrNumber(gp/2)}%)`, `INR ${inrNumber(sg)}`)
    put(`CGST (${inrNumber(gp/2)}%)`, `INR ${inrNumber(cg)}`)
    doc.setFont('courier', 'bold')
    put('Total', `INR ${inrNumber(tt)}`)
    doc.setFont('courier', 'normal')
  }

  // Amount in words block (use gross since totals box removed)
  // Position below the slab breakdown box (or below payment if no breakdown)
  let afterBlockY = y + 32
  if (meta && typeof meta === 'object' && meta.rate_breakup) {
    // height of slab box = sbLH*8 + 24; top = y + 20
    afterBlockY = (y + 20) + (16 * 8 + 24) + 24
  }
  y = afterBlockY
  doc.setFont('helvetica', 'bold'); doc.text('Invoice Amount in Words:', left, y)
  y += 14; doc.setFont('helvetica', 'normal')
  const totalForWords = (breakdownTotal ?? gross)
  const words = doc.splitTextToSize(numberToWordsINR(totalForWords), 500)
  doc.text(words, left, y)

  // Footer sections
  y += 28
  doc.setFont('helvetica', 'bold'); doc.text('Terms & Conditions:', left, y)
  y += 14; doc.setFont('helvetica', 'normal')
  doc.text('Thanks for doing business with us!', left, y)

  // Signature
  drawSignature(doc, company)
}

function drawTemplate(doc: jsPDF, tpl: string, company: any, row: any) {
  if (tpl === 'sales') { drawSalesTemplate(doc, company, row); return }
  if (tpl === 'courier_aryan') { drawCourierAryanTemplate(doc, company, row); return }

  // Default template with industry-standard header
  const left = 40
  const lineH = 16
  let y = drawHeader(doc, company, 'CSV Invoice')

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  const details = [
    ['Party', String(row.sender_name || '')],
    ['Shipment Type', String(row.shipment_type || '')],
    ['Mode', String(row.mode || '')],
    ['Service Type', String(row.service_type || '')],
    ['Place Of Supply', String(distanceDisplay((row.region || row.destination || '') as any, row.recipient_address))],
    ['Consignment No', String(row.consignment_no || '')],
    ['Booking Ref', String(row.booking_reference || '')],
  ]
  details.forEach(([k, v], i) => { doc.text(`${k}:`, left, y + i*lineH); doc.text(String(v ?? ''), left + 120, y + i*lineH) })
  y += details.length * lineH + 10
  // Payment Mode
  doc.setFont('helvetica', 'bold'); doc.text('Payment Mode:', left, y)
  doc.setFont('helvetica', 'normal'); doc.text(String(row.payment_mode || 'Credit'), left + 120, y)
  y += 18
  // Pricing Breakdown (if available)
  const pmeta = ((row as any).pricing_meta || {}) as any
  let defaultBreakdownTotal: number | null = null
  if (pmeta && typeof pmeta === 'object' && pmeta.rate_breakup) {
    const rb = pmeta.rate_breakup as any
    const b = Number(rb.base || 0)
    const fp = Number(rb.fuelPct || rb.fuel_pct || 0)
    const f = Number(rb.fuel || 0)
    const p = Number(rb.packing || 0)
    const h = Number(rb.handling || 0)
    const st = Number(rb.subtotal || (b + f + p + h))
    const gp = Number(rb.gstPct || rb.gst_pct || pmeta.gst_percent || 18)
    const g = Number(rb.gst || (st * gp / 100))
    const sg = +(g / 2).toFixed(2)
    const cg = +(g - sg).toFixed(2)
    const tt = Number(rb.total || (st + g))
    defaultBreakdownTotal = tt
    const sbLeft = left
    const sbTop = y
    const sbW = 360
    const sbLH = 16
    doc.setDrawColor(180)
    doc.rect(sbLeft, sbTop, sbW, sbLH * 8 + 24)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text('Pricing Breakdown', sbLeft + 10, sbTop + 16)
    doc.setFont('courier', 'normal')
    const slabelX = sbLeft + 12
    const scolonX = sbLeft + 180
    const svalueX = sbLeft + sbW - 12
    let sy = sbTop + 30
    const put = (label: string, value: string) => {
      doc.text(label, slabelX, sy)
      doc.text(':', scolonX, sy)
      doc.text(value, svalueX, sy, { align: 'right' as any })
      sy += sbLH
    }
    put('Base Rate', `₹ ${inrNumber(b)}`)
    put(`Fuel (${inrNumber(fp)}%)`, `₹ ${inrNumber(f)}`)
    put('Packing', `₹ ${inrNumber(p)}`)
    put('Handling', `₹ ${inrNumber(h)}`)
    put('Subtotal', `₹ ${inrNumber(st)}`)
    put(`SGST (${inrNumber(gp/2)}%)`, `₹ ${inrNumber(sg)}`)
    put(`CGST (${inrNumber(gp/2)}%)`, `₹ ${inrNumber(cg)}`)
    doc.setFont('courier', 'bold')
    put('Total', `₹ ${inrNumber(tt)}`)
    doc.setFont('courier', 'normal')
    y = sbTop + (sbLH * 8 + 24) + 24
  }

  // Parties simple block
  doc.setFont('helvetica', 'bold'); doc.text('Parties', left, y)
  y += 8; doc.setFont('helvetica', 'normal')
  doc.text(`Sender: ${row.sender_name || ''} | ${row.sender_phone || ''}`, left, y)
  y += 14
  doc.text(`Recipient: ${row.recipient_name || ''} | ${row.recipient_phone || ''}`, left, y)
  y += 20

  // Amount summary: prefer GST-inclusive total from pricing_meta if available
  const baseAmt3 = Number(row.retail_price ?? row.final_collected ?? 0)
  const slabAmt3 = Number((row as any).calculated_amount ?? 0)
  const total = (isFinite(baseAmt3) ? baseAmt3 : 0) + (isFinite(slabAmt3) ? slabAmt3 : 0)
  const pmetaEarly: any = ((row as any).pricing_meta || {})
  const gstInclusiveTotalDefault = (pmetaEarly && pmetaEarly.rate_breakup) ? Number(pmetaEarly.rate_breakup.total || 0) : 0
  const displayTotalDefault = isFinite(gstInclusiveTotalDefault) && gstInclusiveTotalDefault > 0 ? gstInclusiveTotalDefault : total
  const received = Number(row.received_amount ?? 0)
  const displayBalanceDefault = displayTotalDefault - received
  doc.setFont('helvetica', 'bold'); doc.text('Amounts', left, y)
  y += 14; doc.setFont('helvetica', 'normal')
  doc.text(`Total: ${inr(displayTotalDefault)}  |  Received: ${inr(received)}  |  Balance: ${inr(displayBalanceDefault)}`, left, y)
  // Slab note
  if (isFinite(slabAmt3) && slabAmt3 > 0) {
    y += 14
    doc.setFont('helvetica', 'italic')
    doc.text(`Includes slab added: ${inr(slabAmt3)}`, left, y)
    doc.setFont('helvetica', 'normal')
  }

  // Amount in words (use breakdown total if present, else use total)
  y += 16
  const totalForWordsDefault = (defaultBreakdownTotal ?? total)
  doc.setFont('helvetica', 'bold'); doc.text('Invoice Amount in Words:', left, y)
  y += 14; doc.setFont('helvetica', 'normal')
  const wordsDefault = doc.splitTextToSize(numberToWordsINR(totalForWordsDefault), 500)
  doc.text(wordsDefault, left, y)

  // Signature block if any
  if (tpl === 'signature' || tpl === 'default') { drawSignature(doc, company) }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // Check authentication first
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    console.log(`Generating PDF for invoice ${params.id}`);
    const { searchParams } = new URL(request.url);
    const template = searchParams.get('template') || 'default';

    console.log('Fetching invoice data...');
    // Query the database directly instead of using getCsvInvoiceById
    const result = await db.query('SELECT * FROM csv_invoices WHERE id = $1', [params.id]);
    const row = result.rows[0];
    if (!row) {
      console.error('Invoice not found:', params.id);
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // If linked to an invoice, fetch its received_amount to use in Received/Balance
    try {
      if (row.invoice_id) {
        const invRes = await db.query('SELECT received_amount FROM invoices WHERE id = $1', [row.invoice_id])
        if (invRes && typeof invRes.rowCount === 'number' && invRes.rowCount > 0) {
          (row as any).received_amount = invRes.rows[0]?.received_amount ?? 0
        }
      }
    } catch {}

    console.log('Fetching company data...');
    const company = await getAnyActiveCompany();
    if (!company) {
      console.error('No active company found');
      return NextResponse.json({ error: 'No active company configured' }, { status: 500 });
    }

    // Normalize company logo/signature into data URLs if provided as URLs
    try {
      console.log('Processing company assets...');
      const origin = new URL(request.url).origin;
      const logoData = await toDataUrlIfNeeded((company as any)?.logo, origin);
      if (logoData) (company as any).logo = logoData;
      const sigData = await toDataUrlIfNeeded((company as any)?.signature, origin);
      if (sigData) (company as any).signature = sigData;
    } catch (error) {
      console.error('Error processing company assets:', error);
      // Continue even if there's an error with assets
    }

    console.log('Creating PDF document...');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    
    try {
      console.log('Drawing template:', template);
      drawTemplate(doc, template, company, row);
    } catch (templateError) {
      console.error('Error in drawTemplate:', templateError);
      // Create a simple error PDF
      doc.setFont('helvetica');
      doc.setFontSize(12);
      doc.text('Error generating PDF', 50, 50);
      doc.text('Details have been logged.', 50, 70);
    }

    console.log('Generating PDF bytes...');
    const pdfBytes = doc.output('arraybuffer') as ArrayBuffer;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="csv-invoice-${params.id}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('PDF generation failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF', 
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
}
