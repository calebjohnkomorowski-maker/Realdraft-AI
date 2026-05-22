import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, XCircle, Home, DollarSign, Calendar, User, Wrench, Droplets } from 'lucide-react'

function Field({ label, value, mono }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono font-medium' : 'font-medium text-right max-w-[55%]'}>{value}</span>
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-primary" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

export default function OfferSummary({ offerData }) {
  if (!offerData) return null

  const inspections = ['home', 'radon', 'wdo', 'mold', 'septic', 'water_quality']
  const inspLabels = { home: 'Home', radon: 'Radon', wdo: 'WDO/Termite', mold: 'Mold', septic: 'Septic', water_quality: 'Water Quality' }

  return (
    <Card className="h-full overflow-y-auto">
      <CardHeader className="pb-3 sticky top-0 bg-card z-10 border-b">
        <CardTitle className="text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          Offer Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 py-4">

        <Section icon={Home} title="Property">
          <Field label="Address" value={offerData.property_address} />
          <Field label="Municipality" value={offerData.municipality} />
          <Field label="County" value={offerData.county} />
          <Field label="ZIP" value={offerData.property_zip} />
          <Field label="Tax ID" value={offerData.tax_id} />
          <Field label="School District" value={offerData.school_district} />
        </Section>

        <Separator />

        <Section icon={User} title="Parties">
          <Field label="Buyer(s)" value={offerData.buyer_name} />
          <Field label="Seller(s)" value={offerData.seller_name} />
          <Field label="Agent" value={offerData.agent_name} />
          <Field label="Broker" value={offerData.broker_name} />
        </Section>

        <Separator />

        <Section icon={DollarSign} title="Financial">
          <Field label="Purchase Price" value={formatCurrency(offerData.purchase_price_number)} mono />
          <Field label="Initial Deposit" value={formatCurrency(offerData.initial_deposit)} mono />
          {offerData.seller_assist > 0 && (
            <Field label="Seller Assist" value={formatCurrency(offerData.seller_assist)} mono />
          )}
          <Field label="Settlement Date" value={offerData.settlement_date} />
        </Section>

        <Separator />

        <Section icon={DollarSign} title="Financing">
          <Field label="Type" value={offerData.financing_option?.toUpperCase()} />
          {offerData.mortgage_amount && (
            <Field label="Loan Amount" value={formatCurrency(offerData.mortgage_amount)} mono />
          )}
          <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">Mortgage Contingency</span>
            {offerData.mortgage_contingency ? (
              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Yes</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">No</Badge>
            )}
          </div>
        </Section>

        <Separator />

        <Section icon={Wrench} title="Inspections">
          {inspections.map(insp => {
            const val = offerData[`inspection_${insp}`]
            if (!val) return null
            return (
              <div key={insp} className="flex justify-between text-sm py-0.5">
                <span className="text-muted-foreground">{inspLabels[insp]}</span>
                {val === 'elect' ? (
                  <span className="flex items-center gap-1 text-green-700 font-medium text-xs">
                    <CheckCircle2 className="w-3 h-3" /> Elected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground text-xs">
                    <XCircle className="w-3 h-3" /> Waived
                  </span>
                )}
              </div>
            )
          })}
        </Section>

        <Separator />

        <Section icon={Droplets} title="Utilities">
          <Field label="Water" value={offerData.water_type} />
          <Field label="Sewer" value={offerData.sewer_type} />
        </Section>

        {offerData.included_items?.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Inclusions</h4>
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(offerData.included_items)
                  ? offerData.included_items
                  : [offerData.included_items]
                ).map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {offerData.addenda?.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Addenda</h4>
              <div className="flex flex-wrap gap-1">
                {offerData.addenda.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{a.replace(/_/g, ' ')}</Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
