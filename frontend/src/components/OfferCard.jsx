import { formatCurrency, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, DollarSign, Calendar, ArrowRight, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function OfferCard({ offer }) {
  const navigate = useNavigate()
  const address = offer.properties?.address || offer.fields?.property_address || 'Unknown property'
  const price   = offer.fields?.purchase_price_number
  const date    = offer.fields?.settlement_date
  const buyer   = offer.clients?.name || offer.fields?.buyer_name || '—'
  const seller  = offer.fields?.seller_name || '—'
  const status  = offer.status || 'draft'

  return (
    <Card
      className="hover:shadow-md transition-all cursor-pointer hover:border-primary/40 group"
      onClick={() => navigate(`/offers/${offer.id}`)}
    >
      <CardContent className="p-4">
        {/* Address + status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {address}
            </h3>
          </div>
          <Badge className={`${STATUS_COLORS[status]} text-xs flex-shrink-0`}>
            {STATUS_LABELS[status]}
          </Badge>
        </div>

        {/* Parties */}
        <div className="space-y-0.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate">
              <span className="font-medium text-foreground">Buyer:</span> {buyer}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="w-3 h-3 opacity-0" />{/* spacer */}
            <span className="truncate">
              <span className="font-medium text-foreground">Seller:</span> {seller}
            </span>
          </div>
        </div>

        {/* Price + date */}
        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="w-3 h-3" />
            <span className="font-semibold text-foreground">{formatCurrency(price)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span className="truncate">{date || '—'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            {new Date(offer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span className="text-xs font-medium text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            View offer <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
