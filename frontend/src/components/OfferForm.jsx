import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { numberToWords } from '@/lib/utils'

// ── Small reusable field components ──────────────────────────────────────────

function F({ label, required, children }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1 block">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function TextInput({ label, required, value, onChange, placeholder, type = 'text' }) {
  return (
    <F label={label} required={required}>
      <Input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </F>
  )
}

function Select({ label, required, value, onChange, options }) {
  return (
    <F label={label} required={required}>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </F>
  )
}

function ElectWaive({ label, fieldKey, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1">
        {['elect', 'waive'].map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              value === opt
                ? opt === 'elect'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-slate-500 text-white border-slate-500'
                : 'bg-background text-muted-foreground border-input hover:border-foreground'
            }`}
          >
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors font-semibold text-sm"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  )
}

// ── Default form state ────────────────────────────────────────────────────────
const DEFAULTS = {
  // Property
  property_address: '', property_zip: '', municipality: '', county: '',
  school_district: '', tax_id: '', zoning_classification: '',

  // Parties
  buyer_name: '', buyer_address: '', buyer_email: '', buyer_phone: '',
  seller_name: '', seller_address: '', seller_email: '', seller_phone: '',

  // Financial
  purchase_price_number: '', initial_deposit: '', initial_deposit_days: '5',
  additional_deposit: '', additional_deposit_days: '10',
  seller_assist: '0', settlement_date: '', written_acceptance_date: '',
  agreement_date: '',

  // Financing
  financing_option: 'conventional',
  mortgage_amount: '', mortgage_type: 'Conventional', mortgage_term: '30',
  mortgage_ltv: '80', mortgage_rate: '', mortgage_rate_max: '',
  mortgage_lender: '', mortgage_commitment_date: '',

  // Inspections
  inspection_home: 'elect', inspection_radon: 'elect', inspection_wdo: 'elect',
  inspection_mold: 'waive', inspection_septic: 'waive', inspection_water_quality: 'waive',
  inspection_days: '10',

  // Utilities
  water_type: 'public', sewer_type: 'public',

  // Inclusions
  included_items_text: '', excluded_items_text: '',
  is_pre_1978: false,
}

const STANDARD_INCLUSIONS = [
  'Refrigerator', 'Washer', 'Dryer', 'Dishwasher', 'Microwave',
  'Stove/Range', 'Garage Door Opener', 'Window Treatments', 'Shed',
]

// ── Main Form Component ───────────────────────────────────────────────────────
export default function OfferForm({ onSubmit }) {
  const [form, setForm] = useState(DEFAULTS)
  const [checked, setChecked] = useState({})   // standard inclusions checkboxes
  const [errors, setErrors] = useState({})

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  const isCash = form.financing_option === 'cash'
  const isWell  = ['well', 'on-site', 'on_site'].includes(form.water_type)
  const isSeptic = ['septic', 'on-lot', 'on_lot', 'holding tank'].includes(form.sewer_type)

  const toggleInclusion = (item) =>
    setChecked(prev => ({ ...prev, [item]: !prev[item] }))

  const validate = () => {
    const e = {}
    if (!form.property_address) e.property_address = 'Required'
    if (!form.buyer_name)        e.buyer_name        = 'Required'
    if (!form.seller_name)       e.seller_name       = 'Required'
    if (!form.purchase_price_number) e.purchase_price_number = 'Required'
    if (!form.settlement_date)   e.settlement_date   = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) {
      document.getElementById('offer-form-top')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    // Build inclusions list
    const stdIncluded = STANDARD_INCLUSIONS.filter(i => checked[i])
    const extraIncluded = form.included_items_text
      ? form.included_items_text.split(',').map(s => s.trim()).filter(Boolean)
      : []
    const included_items = [...stdIncluded, ...extraIncluded]

    const excluded_items = form.excluded_items_text
      ? form.excluded_items_text.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const priceNum = Number(form.purchase_price_number)

    const offerData = {
      ...form,
      purchase_price_number: priceNum,
      purchase_price_words: numberToWords(priceNum),
      initial_deposit: Number(form.initial_deposit) || 0,
      initial_deposit_days: Number(form.initial_deposit_days) || 5,
      additional_deposit: Number(form.additional_deposit) || 0,
      additional_deposit_days: Number(form.additional_deposit_days) || 10,
      seller_assist: Number(form.seller_assist) || 0,
      mortgage_amount: isCash ? 0 : (Number(form.mortgage_amount) || 0),
      mortgage_term: Number(form.mortgage_term) || 30,
      mortgage_ltv: Number(form.mortgage_ltv) || 0,
      mortgage_rate: Number(form.mortgage_rate) || 0,
      mortgage_rate_max: Number(form.mortgage_rate_max) || 0,
      inspection_days: Number(form.inspection_days) || 10,
      inspection_septic: isSeptic ? form.inspection_septic : 'waive',
      inspection_water_quality: isWell ? form.inspection_water_quality : 'waive',
      included_items,
      excluded_items,
      agreement_date: form.agreement_date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    }

    onSubmit(offerData)
  }

  const err = (key) => errors[key]
    ? <p className="text-xs text-destructive mt-0.5">{errors[key]}</p>
    : null

  return (
    <div className="space-y-4 pb-6" id="offer-form-top">

      {/* ── Property ───────────────────────────────────────────────── */}
      <Section title="🏠  Property">
        <TextInput label="Street Address" required value={form.property_address}
          onChange={set('property_address')} placeholder="456 Elm Street, Pittsburgh" />
        {err('property_address')}
        <div className="grid grid-cols-3 gap-3">
          <TextInput label="ZIP Code" value={form.property_zip} onChange={set('property_zip')} placeholder="15201" />
          <TextInput label="Municipality" value={form.municipality} onChange={set('municipality')} placeholder="Pittsburgh" />
          <TextInput label="County" value={form.county} onChange={set('county')} placeholder="Allegheny" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="School District" value={form.school_district} onChange={set('school_district')} placeholder="Pittsburgh USD" />
          <TextInput label="Tax / Parcel ID" value={form.tax_id} onChange={set('tax_id')} placeholder="0123-A-0456" />
        </div>
        <TextInput label="Zoning Classification" value={form.zoning_classification} onChange={set('zoning_classification')} placeholder="R-1 Single Family" />
      </Section>

      {/* ── Parties ────────────────────────────────────────────────── */}
      <Section title="👥  Parties">
        <p className="text-xs text-muted-foreground -mt-1">Email + phone pre-fill the Send Package step</p>
        {/* Buyer */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <TextInput label="Buyer Name(s)" required value={form.buyer_name}
              onChange={set('buyer_name')} placeholder="Jane & Robert Doe" />
            {err('buyer_name')}
          </div>
          <TextInput label="Buyer Mailing Address" value={form.buyer_address}
            onChange={set('buyer_address')} placeholder="123 Main St, Pittsburgh PA 15201" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Buyer Email" type="email" value={form.buyer_email}
            onChange={set('buyer_email')} placeholder="buyer@email.com" />
          <TextInput label="Buyer Phone" type="tel" value={form.buyer_phone}
            onChange={set('buyer_phone')} placeholder="(412) 555-0100" />
        </div>
        {/* Seller */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div>
            <TextInput label="Seller Name(s)" required value={form.seller_name}
              onChange={set('seller_name')} placeholder="John & Mary Smith" />
            {err('seller_name')}
          </div>
          <TextInput label="Seller Mailing Address" value={form.seller_address}
            onChange={set('seller_address')} placeholder="456 Elm St, Pittsburgh PA 15201" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Seller Email" type="email" value={form.seller_email}
            onChange={set('seller_email')} placeholder="seller@email.com" />
          <TextInput label="Seller Phone" type="tel" value={form.seller_phone}
            onChange={set('seller_phone')} placeholder="(412) 555-0200" />
        </div>
      </Section>

      {/* ── Financial Terms ─────────────────────────────────────────── */}
      <Section title="💰  Financial Terms">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <F label="Purchase Price ($)" required>
              <Input type="number" value={form.purchase_price_number}
                onChange={e => set('purchase_price_number')(e.target.value)}
                placeholder="325000" />
            </F>
            {err('purchase_price_number')}
            {form.purchase_price_number > 0 && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                {numberToWords(Number(form.purchase_price_number))}
              </p>
            )}
          </div>
          <div>
            <F label="Settlement Date" required>
              <Input type="date" value={form.settlement_date}
                onChange={e => set('settlement_date')(e.target.value)} />
            </F>
            {err('settlement_date')}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <F label="Initial Deposit ($)">
            <Input type="number" value={form.initial_deposit} onChange={e => set('initial_deposit')(e.target.value)} placeholder="5000" />
          </F>
          <F label="Due in (days)">
            <Input type="number" value={form.initial_deposit_days} onChange={e => set('initial_deposit_days')(e.target.value)} placeholder="5" />
          </F>
          <F label="Seller Assist ($)">
            <Input type="number" value={form.seller_assist} onChange={e => set('seller_assist')(e.target.value)} placeholder="0" />
          </F>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <F label="Additional Deposit ($)">
            <Input type="number" value={form.additional_deposit} onChange={e => set('additional_deposit')(e.target.value)} placeholder="0" />
          </F>
          <F label="Due in (days)">
            <Input type="number" value={form.additional_deposit_days} onChange={e => set('additional_deposit_days')(e.target.value)} placeholder="10" />
          </F>
          <F label="Written Acceptance By">
            <Input type="date" value={form.written_acceptance_date} onChange={e => set('written_acceptance_date')(e.target.value)} />
          </F>
        </div>
      </Section>

      {/* ── Financing ───────────────────────────────────────────────── */}
      <Section title="🏦  Financing">
        <Select label="Financing Type" required value={form.financing_option} onChange={set('financing_option')}
          options={[
            { value: 'cash',         label: 'Cash — No Mortgage' },
            { value: 'conventional', label: 'Conventional (Contingent)' },
            { value: 'fha',          label: 'FHA (Contingent)' },
            { value: 'va',           label: 'VA (Contingent)' },
            { value: 'usda',         label: 'USDA (Contingent)' },
            { value: 'waived',       label: 'Conventional — Contingency Waived' },
          ]}
        />
        {!isCash && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <F label="Loan Amount ($)">
                <Input type="number" value={form.mortgage_amount} onChange={e => set('mortgage_amount')(e.target.value)} placeholder="260000" />
              </F>
              <Select label="Loan Type" value={form.mortgage_type} onChange={set('mortgage_type')}
                options={[
                  { value: 'Conventional', label: 'Conventional' },
                  { value: 'FHA',          label: 'FHA' },
                  { value: 'VA',           label: 'VA' },
                  { value: 'USDA',         label: 'USDA' },
                ]}
              />
              <F label="Term (years)">
                <Input type="number" value={form.mortgage_term} onChange={e => set('mortgage_term')(e.target.value)} placeholder="30" />
              </F>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <F label="LTV (%)">
                <Input type="number" value={form.mortgage_ltv} onChange={e => set('mortgage_ltv')(e.target.value)} placeholder="80" />
              </F>
              <F label="Rate (%)">
                <Input type="number" step="0.001" value={form.mortgage_rate} onChange={e => set('mortgage_rate')(e.target.value)} placeholder="6.875" />
              </F>
              <F label="Max Rate (%)">
                <Input type="number" step="0.001" value={form.mortgage_rate_max} onChange={e => set('mortgage_rate_max')(e.target.value)} placeholder="7.5" />
              </F>
              <F label="Commitment Date">
                <Input type="date" value={form.mortgage_commitment_date} onChange={e => set('mortgage_commitment_date')(e.target.value)} />
              </F>
            </div>
            <TextInput label="Lender Name" value={form.mortgage_lender} onChange={set('mortgage_lender')} placeholder="First National Bank (or TBD)" />
          </>
        )}
      </Section>

      {/* ── Utilities ───────────────────────────────────────────────── */}
      <Section title="🚰  Utilities">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Water" value={form.water_type} onChange={set('water_type')}
            options={[
              { value: 'public',    label: 'Public Water' },
              { value: 'community', label: 'Community Water' },
              { value: 'on-site',   label: 'On-Site / Well' },
              { value: 'none',      label: 'None' },
            ]}
          />
          <Select label="Sewer" value={form.sewer_type} onChange={set('sewer_type')}
            options={[
              { value: 'public',       label: 'Public Sewer' },
              { value: 'community',    label: 'Community Sewage' },
              { value: 'septic',       label: 'Septic / On-Lot' },
              { value: 'holding tank', label: 'Holding Tank' },
              { value: 'none',         label: 'None' },
            ]}
          />
        </div>
      </Section>

      {/* ── Inspections ─────────────────────────────────────────────── */}
      <Section title="🔍  Inspections">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Contingency Period</span>
          <div className="flex items-center gap-2">
            <Input type="number" value={form.inspection_days}
              onChange={e => set('inspection_days')(e.target.value)}
              className="w-16 h-7 text-sm text-right" />
            <span className="text-xs text-muted-foreground">days</span>
          </div>
        </div>
        <ElectWaive label="Home Inspection"    value={form.inspection_home}    onChange={set('inspection_home')} />
        <ElectWaive label="Radon"              value={form.inspection_radon}   onChange={set('inspection_radon')} />
        <ElectWaive label="Wood Destroying Organisms (Termite)" value={form.inspection_wdo} onChange={set('inspection_wdo')} />
        <ElectWaive label="Mold"               value={form.inspection_mold}    onChange={set('inspection_mold')} />
        {isSeptic && <ElectWaive label="Septic / On-Lot Sewage" value={form.inspection_septic} onChange={set('inspection_septic')} />}
        {isWell   && <ElectWaive label="Water Quality"          value={form.inspection_water_quality} onChange={set('inspection_water_quality')} />}
      </Section>

      {/* ── Inclusions ──────────────────────────────────────────────── */}
      <Section title="📦  Inclusions & Exclusions" defaultOpen={false}>
        <p className="text-xs text-muted-foreground">Check any items included beyond the standard list:</p>
        <div className="grid grid-cols-3 gap-2">
          {STANDARD_INCLUSIONS.map(item => (
            <label key={item} className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={!!checked[item]} onChange={() => toggleInclusion(item)}
                className="rounded border-input" />
              {item}
            </label>
          ))}
        </div>
        <TextInput label="Additional items (comma-separated)" value={form.included_items_text}
          onChange={set('included_items_text')} placeholder="Piano, Hot tub, Storage unit" />
        <TextInput label="Excluded items (comma-separated)" value={form.excluded_items_text}
          onChange={set('excluded_items_text')} placeholder="Dining room chandelier, Garage shelving" />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.is_pre_1978}
            onChange={e => set('is_pre_1978')(e.target.checked)} className="rounded" />
          Property built before 1978 (triggers Lead Paint Addendum)
        </label>
      </Section>

      {/* ── Submit ──────────────────────────────────────────────────── */}
      {Object.keys(errors).length > 0 && (
        <p className="text-sm text-destructive text-center">
          Please fill in the required fields marked with *.
        </p>
      )}

      <Button onClick={handleSubmit} size="lg" className="w-full">
        <FileText className="w-4 h-4 mr-2" />
        Generate Offer PDF
      </Button>
    </div>
  )
}
