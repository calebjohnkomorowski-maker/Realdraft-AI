import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus, Clock, PenLine, CheckCircle2, XCircle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import OfferCard from '@/components/OfferCard'
import { offers as offersApi } from '@/lib/api'
import { formatCurrency, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'

// Demo agent ID — replace with Supabase Auth session in production
const AGENT_ID = 'demo-agent'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [offerList, setOfferList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    offersApi.list(AGENT_ID)
      .then(setOfferList)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const byStatus = (status) => offerList.filter(o => o.status === status).length
  const active = offerList.filter(o => !['executed', 'cancelled'].includes(o.status))
  const recent = offerList.slice(0, 6)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Your PA offer pipeline at a glance</p>
        </div>
        <Button onClick={() => navigate('/new-offer')}>
          <FilePlus className="w-4 h-4 mr-2" />
          Write New Offer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Total Offers" value={offerList.length} color="bg-blue-100 text-blue-600" />
        <StatCard icon={Clock} label="Active" value={active.length} color="bg-yellow-100 text-yellow-600" />
        <StatCard icon={PenLine} label="Pending Signature" value={byStatus('pending_signature')} color="bg-purple-100 text-purple-600" />
        <StatCard icon={CheckCircle2} label="Executed" value={byStatus('executed')} color="bg-green-100 text-green-600" />
      </div>

      {/* Recent Offers */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent Offers</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i}><CardContent className="p-4"><div className="h-24 bg-muted animate-pulse rounded" /></CardContent></Card>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FilePlus className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">No offers yet</p>
              <p className="text-muted-foreground text-sm mb-4">Write your first offer in seconds using AI</p>
              <Button onClick={() => navigate('/new-offer')}>Write New Offer</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {recent.map(offer => <OfferCard key={offer.id} offer={offer} />)}
          </div>
        )}
      </div>
    </div>
  )
}
