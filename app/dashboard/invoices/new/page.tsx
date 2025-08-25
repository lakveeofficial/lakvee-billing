'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Calculator,
  Upload,
  X
} from 'lucide-react'
import { InvoiceFormData, InvoiceItem, PAYMENT_TYPES, UNIT_OPTIONS, GST_RATE, PaymentStatus, InvoiceStatus } from '@/types/invoice'
import { RateSlab } from '@/types/slab'
import { Party } from '@/types/party'
import PageHeader from '@/components/PageHeader'

// Using backend APIs for parties and invoices; removed localStorage-based storages

export default function NewInvoicePage() {
  const [slabError, setSlabError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [parties, setParties] = useState<Party[]>([])
  const [isLoadingParties, setIsLoadingParties] = useState<boolean>(false)
  const [partyLoadError, setPartyLoadError] = useState<string | null>(null)
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)
  const [slabs, setSlabs] = useState<RateSlab[]>([])
  const [applyRateSlabs, setApplyRateSlabs] = useState(true)
  // Track previous slab application for edit mode to avoid double-counting
  const [prevApplySlab, setPrevApplySlab] = useState<boolean>(false)
  const [prevSlabAmount, setPrevSlabAmount] = useState<number>(0)
  // When editing, preserve the original invoice date
  const [editInvoiceDate, setEditInvoiceDate] = useState<string | null>(null)
  // New: Booking & Rate Inputs (moved from Booking page)
  const [rateInputs, setRateInputs] = useState({
    fuel_pct: '',           // number as string
    packing: '',            // number as string
    handling: '',           // number as string
    gst_percent: '',        // number as string
  })
  // Resolver breakdown per-item (keyed by item id)
  const [itemRateInfo, setItemRateInfo] = useState<Record<string, { found: boolean; baseRate?: number; fuelPct?: number | null; packing?: number | null; handling?: number | null; gstPct?: number | null; slabName?: string }>>({})
  // Masters for dropdowns (parity with Booking page)
  const [modes, setModes] = useState<{ id: number; title: string }[]>([])
  const [services, setServices] = useState<{ id: number; title: string; code?: string }[]>([])
  const [regions, setRegions] = useState<{ id: number; title: string }[]>([])
  const [weightSlabs, setWeightSlabs] = useState<{ id: number; slab_name: string }[]>([])
  const [partySlabRows, setPartySlabRows] = useState<Array<{ id: number; party_id: number; shipment_type: 'DOCUMENT' | 'NON_DOCUMENT'; mode_id: number; service_type_id: number; distance_slab_id: number; slab_id: number; rate: number; fuel_pct?: number | null; handling?: number | null; gst_pct?: number | null; is_active?: boolean }>>([])
  // New: Booking Details metadata (parity with Booking page)
  const [bookingDetails, setBookingDetails] = useState({
    booking_ref: '',
    consignment_no: '',
    declared_value: '',
    eway_bill: '',
    gst_invoice: '',
    recipient_name: '',
    recipient_phone: '',
    recipient_address: '',
    service_code: '',
    chargeable_weight: '',
    prepaid_amount: '',
    final_collected: '',
    retail_price: '',
    risk_type: 'NONE', // NONE | PERCENT | FIXED
    risk_value: '',
    emp_disc_pct: '',
    emp_disc_amt: '',
    promo_code: '',
    promo_disc_amt: '',
    booking_mode: '', // Counter | Online | Pickup
    payment_utr: '',
    employee_code: '',
    packing_material: '',
    stretch_films_used: '',
  })
  const [totals, setTotals] = useState({
    subtotal: 0,
    totalDiscount: 0,
    totalTax: 0,
    rateSlabsAmount: 0,
    additionalCharges: 0,
    grandTotal: 0,
    roundOff: 0,
    finalTotal: 0
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('editId')
  const isEditing = !!editId

  // Helper: generate short unique codes like BK-20250818-ABCD
  const genCode = (prefix: string) => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `${prefix}-${y}${m}${day}-${rand}`
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    control,
    reset
  } = useForm<InvoiceFormData>({
    defaultValues: {
      customerId: '',
      billingName: '',
      billingAddress: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      shippingAddress: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      stateOfSupply: '',
      items: [{
        id: 'item_1',
        invoiceDate: new Date().toISOString().split('T')[0],
        bookingDate: new Date().toISOString().split('T')[0],
        destination: '',
        quantity: 1,
        weightKg: 0,
        shipmentType: undefined as any,
        modeId: undefined as any,
        serviceTypeId: undefined as any,
        regionId: undefined as any,
        pricePerUnit: 0,
        discount: { percentage: 0, amount: 0 },
        tax: { percentage: GST_RATE, amount: 0 },
        totalAmount: 0
      }],
      additionalCharges: {
        shipping: 0,
        packaging: 0,
        fuelCharges: 0,
        tcs: 0,
        otherCharges: 0
      },
      paymentType: 'cash',
      receivedAmount: 0,
      notes: ''
    }
  });

  // Load masters for rate dropdowns

  // Watch items array to react immediately to dropdown/weight changes
  const itemsWatch: any[] = useWatch({ control: (control as any), name: 'items' }) as any[]
  useEffect(() => {
    (async () => {
      try {
        const [mm, ss, rr, ww] = await Promise.all([
          fetch('/api/slabs/modes', { credentials: 'include' }),
          fetch('/api/slabs/service-types', { credentials: 'include' }),
          fetch('/api/slabs/distance', { credentials: 'include' }),
          fetch('/api/slabs/weight', { credentials: 'include' }),
        ])
        const mj = (await mm.json()) || {}
        const sj = (await ss.json()) || {}
        const rj = (await rr.json()) || {}
        const wj = (await ww.json()) || {}
        setModes(mj.data || [])
        setServices(sj.data || [])
        setRegions(rj.data || [])
        setWeightSlabs(wj.data || [])
      } catch (e) {
        // non-blocking; keep as free text if failed
        console.warn('Failed to load rate masters', e)
      }
    })()
  }, [])

  // Load party slabs when party changes
  useEffect(() => {
    (async () => {
      try {
        if (!selectedParty?.id) { setPartySlabRows([]); return }
        const res = await fetch(`/api/party-rate-slabs?partyId=${selectedParty.id}`, { credentials: 'include' })
        if (!res.ok) { setPartySlabRows([]); return }
        const j = await res.json()
        const rows = (j.data || []).filter((r: any) => r.is_active !== false)
        setPartySlabRows(rows)
      } catch (e) {
        setPartySlabRows([])
      }
    })()
  }, [selectedParty?.id])

  // Booking-level slab selection removed; items now carry their own attributes.

  // Watch customer selection to reactively set selectedParty
  const watchCustomerId = watch('customerId')

  const loadSlabs = async () => {
    try {
      const res = await fetch('/api/slabs', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load slabs')
      const data = await res.json()
      const list: RateSlab[] = Array.isArray(data) ? data : (data.data || [])
      // only active slabs
      setSlabs((list || []).filter(s => s.status === 'active'))
    } catch (e) {
      console.error('Failed to load slabs', e)
      setSlabs([])
    }
  }

  const getPartyBaseRate = (party: Party | null): number => {
    if (!party) return 0
    let rate = 0
    const byId = (id?: string) => slabs.find(s => String(s.id) === String(id))
    const weight = byId(party.weightSlabId)
    if (weight) rate += Number(weight.rate || 0)
    const volume = byId(party.volumeSlabId)
    if (volume) rate += Number(volume.rate || 0)
    const cod = byId(party.codSlabId)
    if (cod) rate += Number(cod.rate || 0)
    const distance = byId(party.distanceSlabId)
    if (distance) {
      // Ensure distance category matches if present on slab
      if (!distance.distanceCategory || distance.distanceCategory === (party.distanceCategory as any)) {
        rate += Number(distance.rate || 0)
      }
    }
    return rate
  }

  const getPartyRateBreakdown = (party: Party | null) => {
    if (!party) return null
    const byId = (id?: string) => slabs.find(s => String(s.id) === String(id))
    const weight = byId(party.weightSlabId)
    const volume = byId(party.volumeSlabId)
    const cod = byId(party.codSlabId)
    const distance = byId(party.distanceSlabId)
    const distanceOk = distance && (!distance.distanceCategory || distance.distanceCategory === (party.distanceCategory as any))
    const parts = {
      weight: weight ? { label: weight.slabLabel, rate: Number(weight.rate || 0) } : null,
      distance: distanceOk ? { label: distance!.slabLabel, rate: Number(distance!.rate || 0), category: distance!.distanceCategory } : null,
      volume: volume ? { label: volume.slabLabel, rate: Number(volume.rate || 0) } : null,
      cod: cod ? { label: cod.slabLabel, rate: Number(cod.rate || 0) } : null,
    }
    const total = [parts.weight?.rate, parts.distance?.rate, parts.volume?.rate, parts.cod?.rate]
      .filter((n): n is number => typeof n === 'number')
      .reduce((a, b) => a + b, 0)
    return { ...parts, total }
  }

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'items'
  })

  const watchedFields = watch()

  useEffect(() => {
    loadParties()
    loadSlabs()
  }, [])

  useEffect(() => {
    calculateTotals()
  }, [watchedFields, applyRateSlabs, selectedParty])

  // Auto-fill Rate (pricePerUnit) from Party Slabs when row selects change
  useEffect(() => {
    try {
      const items: any[] = Array.isArray(itemsWatch) ? itemsWatch : []
      if (!items.length) return
      if (!partySlabRows || partySlabRows.length === 0) return
      items.forEach((row, idx) => {
        const current = Number(row?.pricePerUnit)
        // Only auto-set when empty/zero to avoid overriding manual edits
        if (isNaN(current) || current <= 0) {
          const shipment = row?.shipmentType
          const modeId = row?.modeId
          const serviceId = row?.serviceTypeId
          const regionId = row?.regionId
          if (!shipment || !modeId || !serviceId || !regionId) return
          const match = partySlabRows.find(r =>
            r.shipment_type === shipment &&
            String(r.mode_id) === String(modeId) &&
            String(r.service_type_id) === String(serviceId) &&
            String(r.distance_slab_id) === String(regionId)
          )
          if (match && Number(match.rate) > 0) {
            setValue(`items.${idx}.pricePerUnit`, Number(match.rate) as any, { shouldDirty: true, shouldValidate: true })
          }
        }
      })
    } catch {}
  }, [itemsWatch, partySlabRows, setValue])

  // Auto-resolve Rate (pricePerUnit) from server based on weight + selections
  useEffect(() => {
    const items: any[] = Array.isArray(itemsWatch) ? itemsWatch : []
    if (!items.length) return
    if (!selectedParty?.id) return

    items.forEach(async (row, idx) => {
      try {
        const shipment: 'DOCUMENT' | 'NON_DOCUMENT' | undefined = row?.shipmentType
        const modeId = row?.modeId
        const serviceTypeId = row?.serviceTypeId
        const regionId = row?.regionId
        const weightKg = row?.weightKg

        const hasAll = !!shipment && !!modeId && !!serviceTypeId && !!regionId && (weightKg !== undefined && weightKg !== null && String(weightKg).length > 0)
        if (!hasAll) return

        const grams = Math.max(0, Math.round(Number(weightKg) * 1000))
        const url = new URL('/api/party-rate-slabs/resolve', window.location.origin)
        url.searchParams.set('partyId', String(selectedParty.id))
        url.searchParams.set('shipmentType', shipment)
        url.searchParams.set('modeId', String(modeId))
        url.searchParams.set('serviceTypeId', String(serviceTypeId))
        url.searchParams.set('distanceSlabId', String(regionId))
        url.searchParams.set('weightGrams', String(grams))

        const res = await fetch(url.toString(), { credentials: 'include' })
        const itemId = row?.id || `idx_${idx}`
        if (!res.ok) {
          // Mark not found for UI hint
          setItemRateInfo(prev => ({ ...prev, [itemId]: { found: false } }))
          return
        }
        const j = await res.json()
        const data = j?.data || null
        const baseRate = Number(data?.baseRate)
        const fuelPct = data?.fuelPct != null ? Number(data.fuelPct) : null
        const packing = data?.packing != null ? Number(data.packing) : null
        const handling = data?.handling != null ? Number(data.handling) : null
        const gstPct = data?.gstPct != null ? Number(data.gstPct) : null
        const slabName = data?.slabName || data?.slab_name || undefined

        if (isFinite(baseRate) && baseRate >= 0) {
          // Only auto-set when empty/zero to avoid overriding manual edits
          const current = Number(row?.pricePerUnit)
          if (!isFinite(current) || current <= 0) {
            setValue(`items.${idx}.pricePerUnit`, baseRate as any, { shouldDirty: true, shouldValidate: true })
          }
          // Store breakdown for UI
          setItemRateInfo(prev => ({
            ...prev,
            [itemId]: { found: true, baseRate, fuelPct, packing, handling, gstPct, slabName }
          }))
        } else {
          setItemRateInfo(prev => ({ ...prev, [itemId]: { found: false } }))
        }
      } catch (e) {
        // silent fail; keep user-entered value and show not found hint
        try {
          const itemId = (row && row.id) ? row.id : `idx_${idx}`
          setItemRateInfo(prev => ({ ...prev, [itemId]: { found: false } }))
        } catch {}
      }
    })
  }, [itemsWatch, selectedParty?.id, setValue])

  // Mirror first item's resolved breakdown into Booking & Rate Inputs (Fuel, Packing, Handling, GST)
  useEffect(() => {
    try {
      const first = Array.isArray(itemsWatch) ? itemsWatch[0] : null
      const firstId = first?.id
      if (!firstId) return
      const info = itemRateInfo[firstId]
      if (!info || info.found !== true) return
      const nextFuel = (info.fuelPct != null && isFinite(info.fuelPct)) ? String(info.fuelPct) : undefined
      const nextPacking = (info.packing != null && isFinite(info.packing)) ? String(info.packing) : undefined
      const nextHandling = (info.handling != null && isFinite(info.handling)) ? String(info.handling) : undefined
      const nextGst = (info.gstPct != null && isFinite(info.gstPct)) ? String(info.gstPct) : undefined
      if (nextFuel == null && nextPacking == null && nextHandling == null && nextGst == null) return
      setRateInputs(prev => ({
        fuel_pct: nextFuel ?? prev.fuel_pct,
        packing: nextPacking ?? prev.packing,
        handling: nextHandling ?? prev.handling,
        gst_percent: nextGst ?? prev.gst_percent,
      }))
    } catch {}
  }, [itemRateInfo, itemsWatch])

  useEffect(() => {
    if (selectedParty) {
      // Prefill name if empty
      const currentName = watch('billingName')
      if (!currentName) {
        setValue('billingName', selectedParty.partyName)
      }
      setValue('billingAddress', selectedParty.billingAddress)
      setValue('shippingAddress', selectedParty.shippingAddress || selectedParty.billingAddress)
      setValue('stateOfSupply', selectedParty.state)
    }
  }, [selectedParty, setValue, watch])

  // Prefill form when editing
  useEffect(() => {
    if (!editId) return
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    ;(async () => {
      try {
        const res = await fetch(`/api/invoices/${editId}`, { credentials: 'include', signal: controller.signal })
        if (!res.ok) {
          // If invoice not found, just stay in create mode
          console.error('Failed to load invoice for edit', res.status)
          return
        }
        const inv = await res.json()
        if (cancelled) return

        // Helper to normalize date to YYYY-MM-DD for input[type="date"]
        const toYMD = (d: any) => {
          if (!d) return undefined
          try {
            const dt = new Date(d)
            if (isNaN(dt.getTime())) return undefined
            return dt.toISOString().split('T')[0]
          } catch {
            return undefined
          }
        }

        // Map API invoice to form values
        const items: InvoiceItem[] = Array.isArray(inv.items) && inv.items.length > 0
          ? inv.items.map((it: any, idx: number) => ({
              id: `item_${idx + 1}`,
              // map persisted consignment if available
              consignmentNo: it.consignment_no || it.consignmentNo || undefined,
              invoiceDate: toYMD(inv.invoice_date) || new Date().toISOString().split('T')[0],
              bookingDate: toYMD(it.booking_date) || toYMD(inv.invoice_date) || new Date().toISOString().split('T')[0],
              destination: it.item_description || '',
              quantity: Number(it.quantity) || 1,
              weightKg: Number(it.weight_kg) || 0,
              shipmentType: (it.shipment_type === 'DOCUMENT' || it.shipment_type === 'NON_DOCUMENT') ? it.shipment_type : undefined,
              modeId: it.mode_id != null ? String(it.mode_id) : undefined,
              serviceTypeId: it.service_type_id != null ? String(it.service_type_id) : undefined,
              regionId: it.distance_slab_id != null ? String(it.distance_slab_id) : undefined,
              pricePerUnit: Number(it.unit_price) || 0,
              discount: { percentage: 0, amount: 0 },
              tax: { percentage: GST_RATE, amount: 0 },
              totalAmount: Number(it.total_price) || 0,
            }))
          : [{
              id: 'item_1',
              invoiceDate: new Date().toISOString().split('T')[0],
              bookingDate: new Date().toISOString().split('T')[0],
              destination: '',
              quantity: 1,
              weightKg: 0,
              shipmentType: undefined as any,
              modeId: undefined as any,
              serviceTypeId: undefined as any,
              regionId: undefined as any,
              pricePerUnit: 0,
              discount: { percentage: 0, amount: 0 },
              tax: { percentage: GST_RATE, amount: 0 },
              totalAmount: 0,
            }]

        // Preserve invoice date for edit submissions
        setEditInvoiceDate(inv.invoice_date || null)

        // Items for reset are directly from API mapping (no localStorage meta)
        let itemsForReset = items
        try {
          const csvRows = Array.isArray(inv.csv_rows) ? inv.csv_rows : []
          if (csvRows.length > 0) {
            itemsForReset = itemsForReset.map((row, i) => ({
              ...row,
              // Bind consignment from CSV row by order; fallback keeps existing
              consignmentNo: (csvRows[i] && (csvRows[i].consignment_no || csvRows[i].consignmentNo)) || (row as any).consignmentNo || undefined,
            }))
          }
        } catch {}

        // Ensure field array renders with loaded items (reset alone may not sync useFieldArray)
        replace(itemsForReset)

        reset({
          customerId: String(inv.party_id || ''),
          billingName: inv.billing_name || '',
          billingAddress: {
            street: '',
            city: '',
            state: '',
            pincode: '',
            country: 'India'
          },
          shippingAddress: {
            street: '',
            city: '',
            state: '',
            pincode: '',
            country: 'India'
          },
          stateOfSupply: '',
          items: itemsForReset,
          additionalCharges: {
            shipping: 0,
            packaging: 0,
            fuelCharges: 0,
            tcs: 0,
            // If previous invoices stored slab inside additional_charges, subtract it out on edit
            otherCharges: (() => {
              const base = Number(inv.additional_charges) || 0
              const slab = Number(inv.slab_amount) || 0
              return inv.apply_slab ? Math.max(0, base - slab) : base
            })(),
          },
          paymentType: 'cash',
        })

        // In edit mode, prefer API apply_slab if available; otherwise fall back to localStorage; default to false
        const apiApply = typeof inv.apply_slab === 'boolean' ? inv.apply_slab : undefined
        if (typeof apiApply === 'boolean') {
          setApplyRateSlabs(apiApply)
        } else if (typeof window !== 'undefined') {
          const savedToggle = localStorage.getItem(`invoice:${editId}:applyRateSlabs`)
          if (savedToggle === 'true' || savedToggle === 'false') {
            setApplyRateSlabs(savedToggle === 'true')
          } else {
            setApplyRateSlabs(false)
          }
        } else {
          setApplyRateSlabs(false)
        }

        // Defer selecting party until parties are loaded
        setValue('customerId', String(inv.party_id || ''))
      } catch (e) {
        console.error('Error pre-filling invoice edit:', e)
      } finally {
        clearTimeout(timeoutId)
      }
    })()
    return () => { cancelled = true; controller.abort(); clearTimeout(timeoutId) }
  }, [editId, reset, setValue])

  // Persist applyRateSlabs state per-invoice while editing
  useEffect(() => {
    if (!editId) return
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(`invoice:${editId}:applyRateSlabs`, String(applyRateSlabs))
    } catch {}
  }, [applyRateSlabs, editId])

  // Removed persistence of item meta (Item No., Unit) as fields are no longer used

  // Once parties or customerId change, set selected party
  useEffect(() => {
    const cid = watchCustomerId
    if (!cid) return
    if (!parties || parties.length === 0) return
    const p = parties.find(p => p.id === cid)
    setSelectedParty(p || null)
  }, [parties, watchCustomerId])

  // Auto-generate Booking Ref when party is selected (not in edit mode)
  useEffect(() => {
    if (!selectedParty) return
    if (isEditing) return
    setBookingDetails(v => ({
      ...v,
      booking_ref: v.booking_ref && v.booking_ref.trim() ? v.booking_ref : genCode('BK'),
    }))
  }, [selectedParty, isEditing])

  // Autofill invoice fields from selected party (without overwriting user input), skip in edit mode
  useEffect(() => {
    if (!selectedParty) return
    if (isEditing) return

    const party = selectedParty
    const current = watchedFields

    // Billing Name
    if (!current.billingName) {
      setValue('billingName', party.partyName || '')
    }

    // Billing Address
    const b = party.billingAddress || ({} as any)
    if (!current.billingAddress?.street && b.street) setValue('billingAddress.street', b.street)
    if (!current.billingAddress?.city && b.city) setValue('billingAddress.city', b.city)
    if (!current.billingAddress?.state && (b.state || party.state)) setValue('billingAddress.state', b.state || party.state || '')
    if (!current.billingAddress?.pincode && b.pincode) setValue('billingAddress.pincode', b.pincode)
    if (!current.billingAddress?.country) setValue('billingAddress.country', b.country || 'India')

    // Shipping Address (default same as billing unless already set)
    if (!current.shippingAddress?.street && b.street) setValue('shippingAddress.street', b.street)
    if (!current.shippingAddress?.city && b.city) setValue('shippingAddress.city', b.city)
    if (!current.shippingAddress?.state && (b.state || party.state)) setValue('shippingAddress.state', b.state || party.state || '')
    if (!current.shippingAddress?.pincode && b.pincode) setValue('shippingAddress.pincode', b.pincode)
    if (!current.shippingAddress?.country) setValue('shippingAddress.country', b.country || 'India')

    // State of Supply
    if (!current.stateOfSupply) {
      setValue('stateOfSupply', party.state || b.state || '')
    }
  }, [selectedParty, isEditing, watchedFields, setValue])

  const loadParties = async () => {
    setIsLoadingParties(true)
    setPartyLoadError(null)
    try {
      const res = await fetch('/api/parties', { credentials: 'include' })
      if (!res.ok) {
        const msg = res.status === 401 ? 'Unauthorized. Please sign in.' : `Failed to load parties (HTTP ${res.status})`
        throw new Error(msg)
      }
      const json = await res.json()
      const apiParties = (json.data || []) as any[]
      // Map API response to Party shape with sensible defaults
      const mapped: Party[] = apiParties.map((row: any) => ({
        id: String(row.id),
        partyName: row.partyName || row.party_name || 'Unknown',
        contactPerson: row.contactPerson || row.contact_person || '',
        phoneNumber: row.phoneNumber || row.phone || '',
        email: row.email || '',
        billingAddress: {
          street: row.billingAddress?.street ?? row.address ?? '',
          city: row.billingAddress?.city ?? row.city ?? '',
          state: row.state || '',
          pincode: row.billingAddress?.pincode ?? row.pincode ?? '',
          country: 'India',
        },
        useShippingAddress: false,
        shippingAddress: undefined,
        gstin: row.gstin ?? row.gst_number ?? '',
        panNumber: row.panNumber ?? row.pan_number ?? '',
        gstType: row.gstType ?? row.gst_type ?? 'unregistered',
        state: row.state || '',
        weightSlabId: row.weightSlabId ?? row.weight_slab_id ?? undefined,
        distanceSlabId: row.distanceSlabId ?? row.distance_slab_id ?? undefined,
        distanceCategory: row.distanceCategory ?? row.distance_category ?? undefined,
        volumeSlabId: row.volumeSlabId ?? row.volume_slab_id ?? undefined,
        codSlabId: row.codSlabId ?? row.cod_slab_id ?? undefined,
        createdAt: row.createdAt ?? row.created_at ?? '',
        updatedAt: row.updatedAt ?? row.updated_at ?? '',
      }))
      setParties(mapped)
    } catch (e: any) {
      console.error('Failed to load parties', e)
      setParties([])
      setPartyLoadError(e?.message || 'Failed to load parties')
    } finally {
      setIsLoadingParties(false)
    }
  }

  const handleCustomerChange = (customerId: string) => {
    const party = parties.find(p => p.id === customerId)
    setSelectedParty(party || null)
    setValue('customerId', customerId)
    // Do not auto-fill item pricePerUnit from slabs; keep user-controlled
  }

  const calculateItemTotal = (item: InvoiceItem) => {
    const qty = Number(item.quantity) || 0
    const ppu = Number(item.pricePerUnit) || 0
    return qty * ppu
  }

  const calculateTotals = () => {
    const items = watchedFields.items || []
    const additionalCharges = watchedFields.additionalCharges || {}

    let subtotal = 0
    let totalDiscount = 0
    let totalTax = 0
    // Rate slabs removed: always zero
    let rateSlabsAmount = 0

    items.forEach((item: InvoiceItem) => {
      const qty = Number(item.quantity) || 0
      const ppu = Number(item.pricePerUnit) || 0
      const baseAmount = qty * ppu
      subtotal += baseAmount
    })

    const additionalChargesTotal = Object.values(additionalCharges).reduce((sum: number, charge: any) => sum + (parseFloat(charge) || 0), 0)
    // rate slabs removed: do not add slab amount
    totalDiscount = 0
    totalTax = 0
    const grandTotal = subtotal + additionalChargesTotal
    const roundOff = Math.round(grandTotal) - grandTotal
    const finalTotal = Math.round(grandTotal)

    setTotals({
      subtotal,
      totalDiscount,
      totalTax,
      rateSlabsAmount, // stays 0
      additionalCharges: additionalChargesTotal,
      grandTotal,
      roundOff,
      finalTotal
    })
  }

  // Ensure every item has a consignment number; generate if missing
  useEffect(() => {
    const items = watchedFields.items || []
    items.forEach((it: any, i: number) => {
      if (!it?.consignmentNo || !String(it.consignmentNo).trim()) {
        setValue(`items.${i}.consignmentNo` as any, genCode('CN'))
      }
    })
  }, [watchedFields.items?.length])

  const addItem = () => {
    const defaultPrice = 0
    const defaultGst = rateInputs.gst_percent ? Number(rateInputs.gst_percent) || GST_RATE : GST_RATE
    append({
      id: `item_${Date.now()}`,
      consignmentNo: genCode('CN'),
      invoiceDate: new Date().toISOString().split('T')[0],
      bookingDate: new Date().toISOString().split('T')[0],
      destination: '',
      quantity: 1,
      weightKg: 0,
      shipmentType: undefined as any,
      modeId: undefined as any,
      serviceTypeId: undefined as any,
      regionId: undefined as any,
      pricePerUnit: defaultPrice,
      discount: { percentage: 0, amount: 0 },
      tax: { percentage: defaultGst, amount: 0 },
      totalAmount: 0
    })
  }

  const onSubmit = async (data: InvoiceFormData) => {
    setSlabError(null);
    if (!selectedParty) {
      alert('Please select a party/sender')
      return
    }

    // Validate slab assignments presence
    const slabChecks: string[] = [];
    if (!selectedParty.weightSlabId) slabChecks.push('Weight Slab');
    if (!selectedParty.distanceSlabId) slabChecks.push('Distance Slab');
    if (!selectedParty.distanceCategory) slabChecks.push('Distance Category');
    if (!selectedParty.volumeSlabId) slabChecks.push('Volume Slab');
    if (!selectedParty.codSlabId) slabChecks.push('COD Value Slab');

    // Presence-only check: do not block submission, just warn the user
    if (slabChecks.length > 0) {
      setSlabError('Missing slab assignments: ' + slabChecks.join(', ') + '. You can still create the invoice, but please assign slabs later.');
      // continue without returning
    }

    setIsSubmitting(true)
    try {
      // Prepare items for API payload
      // For simplified model: total = qty * rate, ignore discount and tax in items and totals
      const itemsPayload = data.items.map((item, idx) => {
        const qty = Number(item.quantity) || 0
        const ppu = Number(item.pricePerUnit) || 0
        const total = qty * ppu
        const modeTitle = modes.find(m => String(m.id) === String((item as any).modeId))?.title || ''
        const serviceTitle = services.find(s => String(s.id) === String((item as any).serviceTypeId))?.title || ''
        const regionTitle = regions.find(rg => String(rg.id) === String((item as any).regionId))?.title || ''
        const shipment = (item as any).shipmentType || ''
        const descParts = [serviceTitle, modeTitle, regionTitle, shipment].filter(Boolean)
        const fallback = `Item #${idx + 1}`
        const itemDesc = descParts.length ? descParts.join(' • ') : fallback
        return {
          item_description: itemDesc,
          quantity: qty,
          unit_price: ppu,
          total_price: Math.max(0, total),
          booking_date: item.bookingDate || null,
          // New DB fields
          shipment_type: (item as any).shipmentType || null,
          mode_id: (item as any).modeId != null && String((item as any).modeId).length ? Number((item as any).modeId) : null,
          service_type_id: (item as any).serviceTypeId != null && String((item as any).serviceTypeId).length ? Number((item as any).serviceTypeId) : null,
          distance_slab_id: (item as any).regionId != null && String((item as any).regionId).length ? Number((item as any).regionId) : null,
          weight_kg: (item as any).weightKg != null ? Number((item as any).weightKg) : null,
          consignment_no: (item as any).consignmentNo || null,
        }
      })

      // Build payload matching /api/invoices schema
      const invoiceDate = isEditing && editInvoiceDate
        ? editInvoiceDate
        : (data.items[0]?.invoiceDate || new Date().toISOString().split('T')[0])

      const payload = {
        party_id: Number(selectedParty.id),
        invoice_date: invoiceDate,
        tax_amount: 0,
        additional_charges: totals.additionalCharges || 0,
        received_amount: Number(data.receivedAmount) || 0,
        notes: data.notes || '',
        // slab fields neutralized per UI cleanup
        apply_slab: false,
        slab_amount: 0,
        slab_breakdown: null as any,
        items: itemsPayload,
        // New invoice-level fields saved explicitly
        recipient_name: bookingDetails.recipient_name?.trim() || undefined,
        recipient_phone: bookingDetails.recipient_phone?.trim() || undefined,
        recipient_address: bookingDetails.recipient_address?.trim() || undefined,
        gst_invoice: bookingDetails.gst_invoice?.trim() || undefined,
        prepaid_amount: bookingDetails.prepaid_amount?.toString().trim() ? Number(bookingDetails.prepaid_amount) : undefined,
        final_collected: bookingDetails.final_collected?.toString().trim() ? Number(bookingDetails.final_collected) : undefined,
        retail_price: bookingDetails.retail_price?.toString().trim() ? Number(bookingDetails.retail_price) : undefined,
        chargeable_weight: bookingDetails.chargeable_weight?.toString().trim() ? Number(bookingDetails.chargeable_weight) : undefined,
        booking_ref: bookingDetails.booking_ref || null,
      }

      // Fetch with timeout to avoid infinite loading
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      let res: Response
      try {
        res = await fetch(isEditing ? `/api/invoices/${editId}` : '/api/invoices', {
          method: isEditing ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }

      if (!res.ok) {
        // Try to parse JSON; fallback to text
        let message = isEditing ? 'Failed to update invoice' : 'Failed to create invoice'
        try {
          const err = await res.json()
          message = err.error || err.details || message
        } catch (_) {
          try {
            const text = await res.text()
            if (text) message = text
          } catch {}
        }
        throw new Error(`${message} (HTTP ${res.status})`)
      }

      alert(isEditing ? 'Invoice updated successfully!' : 'Invoice created successfully!')
      // Use hard redirect to ensure page refresh and list reload
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard/invoices'
        return
      } else {
        router.push('/dashboard/invoices')
      }
    } catch (error) {
      console.error(isEditing ? 'Error updating invoice:' : 'Error creating invoice:', error)
      alert(error instanceof Error ? error.message : (isEditing ? 'Failed to update invoice. Please try again.' : 'Failed to create invoice. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title={isEditing ? 'Edit Invoice' : 'Create New Invoice'}
        subtitle={isEditing ? 'Update existing sales invoice' : 'Generate a new sales invoice'}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2 text-rose-200" />
              Back
            </button>
            <button
              type="submit"
              form="invoiceForm"
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-white/20 hover:bg-white/30 border border-white/20 transition-colors"
            >
              <Save className="h-4 w-4 mr-2 text-emerald-200" />
              Save
            </button>
          </div>
        }
      />

      <form id="invoiceForm" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Party / Sender Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Party / Sender Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Party / Sender <span className="text-red-500">*</span>
              </label>
              <select
                {...register('customerId', { required: 'Party / Sender is required' })}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {isLoadingParties && (
                  <option value="" disabled>Loading parties...</option>
                )}
                {!isLoadingParties && partyLoadError && (
                  <option value="" disabled>{partyLoadError}</option>
                )}
                {!isLoadingParties && !partyLoadError && parties.length === 0 && (
                  <option value="" disabled>No parties found</option>
                )}
                {!isLoadingParties && !partyLoadError && parties.length > 0 && (
                  <>
                    <option value="">Select Party / Sender</option>
                    {parties.map(party => (
                      <option key={party.id} value={party.id}>
                        {party.partyName} - {party.phoneNumber}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {errors.customerId && (
                <p className="mt-1 text-sm text-red-600">{errors.customerId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Billing Name (Optional)
              </label>
              <input
                type="text"
                {...register('billingName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Override billing name if different"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Booking Date</label>
              <input
                type="date"
                value={
                  (watchedFields.items?.[0]?.bookingDate as string) || new Date().toISOString().split('T')[0]
                }
                onChange={(e) => {
                  const val = e.target.value
                  // propagate booking date to all items
                  fields.forEach((_, idx) => {
                    setValue(`items.${idx}.bookingDate`, val as any)
                  })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Booking Ref</label>
              <input
                type="text"
                value={bookingDetails.booking_ref}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="BK-..."
                readOnly
              />
            </div>

            

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sender Phone</label>
              <input
                type="text"
                value={selectedParty?.phoneNumber || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Party phone"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={selectedParty?.email || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Party email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sender Address</label>
              <input
                type="text"
                value={selectedParty?.billingAddress?.street || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Street / Address line"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
              <input
                type="text"
                value={selectedParty?.gstin || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="GSTIN"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Billing Address</label>
              <textarea
                value={[
                  selectedParty?.billingAddress?.street,
                  selectedParty?.billingAddress?.city,
                  selectedParty?.billingAddress?.state,
                  selectedParty?.billingAddress?.pincode,
                  selectedParty?.billingAddress?.country,
                ].filter(Boolean).join(', ') || ''}
                readOnly
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                placeholder="Full billing address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State of Supply <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('stateOfSupply', { required: 'State of supply is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="State of supply"
                readOnly={!!selectedParty}
              />
              {errors.stateOfSupply && (
                <p className="mt-1 text-sm text-red-600">{errors.stateOfSupply.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Booking Details (metadata) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Name</label>
              <input
                type="text"
                value={bookingDetails.recipient_name}
                onChange={(e)=>setBookingDetails(v=>({...v, recipient_name: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Phone</label>
              <input
                type="text"
                value={bookingDetails.recipient_phone}
                onChange={(e)=>setBookingDetails(v=>({...v, recipient_phone: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Address</label>
              <textarea
                rows={2}
                value={bookingDetails.recipient_address}
                onChange={(e)=>setBookingDetails(v=>({...v, recipient_address: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                placeholder="Flat/Street, City, State, PIN"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Code</label>
              <input
                type="text"
                value={bookingDetails.service_code}
                onChange={(e)=>setBookingDetails(v=>({...v, service_code: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., EXP, STD"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Booking Mode</label>
              <select
                value={bookingDetails.booking_mode}
                onChange={(e)=>setBookingDetails(v=>({...v, booking_mode: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select</option>
                <option value="Counter">Counter</option>
                <option value="Online">Online</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>
            
            <div className="md:col-span-2 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment UTR (optional)</label>
              <input
                type="text"
                value={bookingDetails.payment_utr}
                onChange={(e)=>setBookingDetails(v=>({...v, payment_utr: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GST Invoice</label>
              <input
                type="text"
                value={bookingDetails.gst_invoice}
                onChange={(e)=>setBookingDetails(v=>({...v, gst_invoice: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter GST invoice number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prepaid Amount</label>
              <input
                type="number" step="0.01" min="0"
                value={bookingDetails.prepaid_amount}
                onChange={(e)=>setBookingDetails(v=>({...v, prepaid_amount: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Final Collected</label>
              <input
                type="number" step="0.01" min="0"
                value={bookingDetails.final_collected}
                onChange={(e)=>setBookingDetails(v=>({...v, final_collected: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Retail Price</label>
              <input
                type="number" step="0.01" min="0"
                value={bookingDetails.retail_price}
                onChange={(e)=>setBookingDetails(v=>({...v, retail_price: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Declared Value</label>
              <input
                type="number" step="0.01" min="0"
                value={bookingDetails.declared_value}
                onChange={(e)=>setBookingDetails(v=>({...v, declared_value: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-Way Bill</label>
              <input
                type="text"
                value={bookingDetails.eway_bill}
                onChange={(e)=>setBookingDetails(v=>({...v, eway_bill: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Risk Type</label>
              <select
                value={bookingDetails.risk_type}
                onChange={(e)=>setBookingDetails(v=>({...v, risk_type: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="NONE">NONE</option>
                <option value="PERCENT">PERCENT</option>
                <option value="FIXED">FIXED</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Risk Value</label>
              <input
                type="number" step="0.01" min="0"
                value={bookingDetails.risk_value}
                onChange={(e)=>setBookingDetails(v=>({...v, risk_value: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee Code</label>
              <input
                type="text"
                value={bookingDetails.employee_code}
                onChange={(e)=>setBookingDetails(v=>({...v, employee_code: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Packing Material Used</label>
              <input
                type="text"
                value={bookingDetails.packing_material}
                onChange={(e)=>setBookingDetails(v=>({...v, packing_material: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">No. of Stretch Films Used</label>
              <input
                type="number" min="0"
                value={bookingDetails.stretch_films_used}
                onChange={(e)=>setBookingDetails(v=>({...v, stretch_films_used: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">These details will be saved with the invoice (metadata) and do not affect totals unless applied manually.</p>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Consignment No</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Qty</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Weight (In Kg)</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Shipment</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Mode</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Service</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Distance</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Rate</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Total</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-sm">
                      <input
                        type="text"
                        {...register(`items.${index}.consignmentNo` as any)}
                        className="w-44 px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50 text-gray-700"
                        readOnly
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="1"
                        {...register(`items.${index}.quantity`, { min: 1 })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        {...register(`items.${index}.weightKg` as any, { min: 0 })}
                        className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="0.000"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        {...register(`items.${index}.shipmentType` as any)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select</option>
                        <option value="DOCUMENT">Document</option>
                        <option value="NON_DOCUMENT">Non Document</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <select
                        {...register(`items.${index}.modeId` as any)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select</option>
                        {modes.map(m => (
                          <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <select
                        {...register(`items.${index}.serviceTypeId` as any)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select</option>
                        {services.map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <select
                        {...register(`items.${index}.regionId` as any)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select</option>
                        {regions.map(rg => (
                          <option key={rg.id} value={rg.id}>{rg.title}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`items.${index}.pricePerUnit`, { min: 0 })}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="0.00"
                      />
                      {(() => {
                        const row: any = watchedFields.items?.[index] || field
                        const info = itemRateInfo[row?.id || field.id]
                        if (!info) return null
                        if (info.found === false) {
                          return (
                            <p className="mt-1 text-[11px] text-amber-600" title="No active rate found for the selected combination.">
                              No rate found for selection
                            </p>
                          )
                        }
                        return null
                      })()}
                    </td>
                    <td className="py-2 px-3 text-sm font-medium">
                      {(() => {
                        const row: any = watchedFields.items?.[index] || field
                        const qty = Number(row?.quantity) || 0
                        const rate = Number(row?.pricePerUnit) || 0
                        return formatCurrency(qty * rate)
                      })()}
                    </td>
                    <td className="py-2 px-3">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Booking & Rate Inputs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Booking & Rate Inputs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fuel %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={rateInputs.fuel_pct}
                onChange={(e) => setRateInputs(v => ({ ...v, fuel_pct: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Packing</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={rateInputs.packing}
                onChange={(e) => setRateInputs(v => ({ ...v, packing: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Handling</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={rateInputs.handling}
                onChange={(e) => setRateInputs(v => ({ ...v, handling: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GST %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={rateInputs.gst_percent}
                onChange={(e) => setRateInputs(v => ({ ...v, gst_percent: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder={String(GST_RATE)}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">These values prefill new line items and are saved with the invoice for reference.</p>
        </div>

        {/* Payment Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('paymentType', { required: 'Payment type is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {PAYMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.paymentType && (
                <p className="mt-1 text-sm text-red-600">{errors.paymentType.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Received Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('receivedAmount', { min: 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Additional notes or instructions..."
            />
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Invoice Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Discount:</span>
                <span className="font-medium text-red-600">-{formatCurrency(totals.totalDiscount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Tax:</span>
                <span className="font-medium">{formatCurrency(totals.totalTax)}</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="text-sm font-medium text-gray-800 mb-2">Price Breakup (Reference)</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fuel %</span>
                    <span className="font-medium">{rateInputs.fuel_pct || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Packing</span>
                    <span className="font-medium">{rateInputs.packing || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Handling</span>
                    <span className="font-medium">{rateInputs.handling || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GST %</span>
                    <span className="font-medium">{rateInputs.gst_percent || '-'}</span>
                  </div>
                </div>
              </div>
              
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Grand Total:</span>
                <span className="font-medium">{formatCurrency(totals.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Round Off:</span>
                <span className="font-medium">{formatCurrency(totals.roundOff)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Final Total:</span>
                <span className="text-primary-600">{formatCurrency(totals.finalTotal)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Received:</span>
                <span className="font-medium text-green-600">{formatCurrency(watchedFields.receivedAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Balance:</span>
                <span className={`font-medium ${(totals.finalTotal - (watchedFields.receivedAmount || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(totals.finalTotal - (watchedFields.receivedAmount || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditing ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}
