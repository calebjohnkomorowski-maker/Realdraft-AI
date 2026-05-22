import { formatCurrency, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, DollarSign, Calendar, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function OfferCard({ offer }) {
  const navigate = useNavigate()
  const address = offer.properties?.address || offer.fields?.property_address || 'Unknown property'
  const price = offer.fields?.purchase_price_number
  const date = offer.fields?.settlement_date
  const buyer = offer.clients?.name || offer.fields?.buyer_name || 'Unknown'
  const status = offer.status || 'draft'

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/offers/${offer.id}`)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{address}</h3>
            <p className="text-xs text-muted-foreground truncate">Buyer: {buyer}</p>
          </div>
          <Badge className={`${STATUS_COLORS[status]} text-xs flex-shrink-0`}>
            {STATUS_LABELS[status]}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="w-3 h-3" />
            <span className="font-semibold text-foreground">{formatCurrency(price)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{date || '—'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            {new Date(offer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
            View <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
